const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com';
const LOG_REQUESTS = process.env.LOG_REQUESTS === 'true';

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(morgan('combined'));

// Modified logging function for Vercel
const logRequest = (req, data) => {
  if (!LOG_REQUESTS) return;
  
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    response: data
  };
  
  console.log('Request Log:', JSON.stringify(logData));
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

// Export the app for Vercel
module.exports = app;