// backend/generateVAPID.js

import webpush from 'web-push';

// Gere um par de chaves VAPID (public e private)
const keys = webpush.generateVAPIDKeys();
console.log(keys);

/*
  Exemplo de saída no console:
  {
    publicKey: 'BCa8yVOwFNaqU1slnsW456J-B7nHF2MxzFIXlNc3ipMXEMzZkwWsIbu5mbvD1fL9I4KuUU9X_G9hOiamCgClGXw',
    privateKey: 'PCBCMUUXM3hB6ll4eXs0ojq-NUA_L11Dkd20cLv2XeA'
  }
  → Copie esses valores para o seu arquivo .env:
    VAPID_PUBLIC_KEY=…
    VAPID_PRIVATE_KEY=…
    VAPID_SUBJECT=mailto:seu-email@seudominio.com
*/
