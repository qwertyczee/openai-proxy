# OpenAI API Proxy Server

Jednoduchý proxy server pro OpenAI API, který loguje všechny požadavky včetně jejich těl a hlaviček.

## Funkce

- Přeposílá všechny požadavky na OpenAI API
- Loguje kompletní obsah requestů včetně hlaviček a těl
- Loguje odpovědi z OpenAI API
- Podporuje použití API klíče z .env souboru nebo z hlavičky požadavku

## Instalace

1. Naklonujte tento repozitář
2. Nainstalujte závislosti:

```bash
npm install
```

3. Vytvořte soubor `.env` podle vzoru a nastavte váš OpenAI API klíč:

```
OPENAI_API_KEY=your_api_key_here
OPENAI_API_BASE_URL=https://api.openai.com
PORT=3000
LOG_REQUESTS=true
```

## Spuštění

Pro vývojové prostředí s automatickým restartem při změnách:

```bash
npm run dev
```

Pro produkční prostředí:

```bash
npm start
```

Server běží na portu 3000 (nebo na portu specifikovaném v .env souboru).

## Použití

Místo volání OpenAI API přímo na `https://api.openai.com/v1/...` použijte adresu vašeho proxy serveru:

```
http://localhost:3000/v1/...
```

Například pro volání chat completion API:

```
POST http://localhost:3000/v1/chat/completions
```

### Autorizace

Můžete použít jeden z těchto způsobů:

1. Nastavit API klíč v souboru `.env`
2. Poslat API klíč v hlavičce `Authorization` jako obvykle

## Logy

Logy requestů jsou ukládány do složky `logs` ve formátu JSON s časovým razítkem.