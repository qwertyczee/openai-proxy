const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Načtení proměnných prostředí z .env souboru
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com';
const LOG_REQUESTS = process.env.LOG_REQUESTS === 'true';

// Vytvoření složky pro logy, pokud neexistuje
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Middleware pro parsování JSON
app.use(express.json({ limit: '50mb' }));

// Middleware pro CORS
app.use(cors());

// Middleware pro základní logování HTTP requestů
app.use(morgan('combined'));

// Funkce pro logování requestů do souboru
const logRequest = (req, data) => {
  if (!LOG_REQUESTS) return;
  
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const logFileName = `${timestamp}-request.json`;
  const logFilePath = path.join(logsDir, logFileName);
  
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    response: data
  };
  
  fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2));
  console.log(`Request logged to ${logFileName}`);
};

// Proxy middleware pro OpenAI API
app.all('/v1/*', async (req, res) => {
  const openaiPath = req.path;
  const fullUrl = `${OPENAI_API_BASE_URL}${openaiPath}`;
  
  console.log(`Proxying request to: ${fullUrl}`);
  
  try {
    // Příprava hlaviček pro OpenAI API
    const headers = { ...req.headers };
    
    // Pokud není v requestu API klíč, použijeme ten z .env
    if (!headers['authorization'] && process.env.OPENAI_API_KEY) {
      headers['authorization'] = `Bearer ${process.env.OPENAI_API_KEY}`;
    }
    
    // Odstranění hlaviček, které by mohly způsobit problémy
    delete headers['host'];
    delete headers['content-length'];
    
    // Provedení requestu na OpenAI API
    const response = await axios({
      method: req.method,
      url: fullUrl,
      headers: headers,
      data: req.body,
      responseType: 'stream'
    });
    
    // Nastavení hlaviček odpovědi
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Příprava pro logování odpovědi
    let responseData = '';
    const responseStream = response.data;
    
    responseStream.on('data', (chunk) => {
      responseData += chunk.toString();
      res.write(chunk);
    });
    
    responseStream.on('end', () => {
      // Logování requestu a odpovědi
      try {
        const parsedResponse = JSON.parse(responseData);
        logRequest(req, parsedResponse);
      } catch (e) {
        logRequest(req, { raw: responseData });
      }
      
      res.end();
    });
    
    responseStream.on('error', (err) => {
      console.error('Error in response stream:', err);
      res.status(500).send('Error in proxy response');
    });
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Logování chyby
    logRequest(req, { error: error.message });
    
    // Odeslání chybové odpovědi klientovi
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Proxy server error', message: error.message });
    }
  }
});

// Základní endpoint pro kontrolu, že server běží
app.get('/', (req, res) => {
  res.json({ status: 'OpenAI API Proxy Server is running' });
});

// Spuštění serveru
app.listen(PORT, () => {
  console.log(`OpenAI API Proxy Server běží na portu ${PORT}`);
  console.log(`Logování requestů: ${LOG_REQUESTS ? 'zapnuto' : 'vypnuto'}`);
  console.log(`OpenAI API Base URL: ${OPENAI_API_BASE_URL}`);
});