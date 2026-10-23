# Décision 006 — frontière de confiance IP (lot 21)

Implémentation locale du 23 octobre 2026, à relire par l’équipe. Répond à SEC20-01, reproduit au SHA `d300b0ba17fbf8d0665c26f6cad52c17ac0011a2`. Pas de déploiement ou de configuration SystaLink déduite de cette décision.

## Trois chemins pris en charge

| Entrée | Source d’adresse | Configuration Nest | Condition d’exploitation |
|---|---|---|---|
| API directement accessible, sans relais | Connexion TCP reçue par Nest | `TRUST_PROXY` vide/false | Les en-têtes client ne définissent aucune IP |
| Développement local / serveur Node `frontend/server.mjs` | `request.socket.remoteAddress` du premier relais Node | IP exacte de ce relais, habituellement `127.0.0.1` | Le relais écoute en loopback. Nest est interne. Le navigateur utilise l’origine canonique `APP_ORIGIN` |
| Frontal nginx prévu | `$remote_addr` de nginx ; remplacement de XFF, jamais ajout au XFF reçu | IP exacte du pair nginx réellement observé par Nest | `/api/v1/` directement vers Nest ; autres pages vers Next interne ; ports internes interdits au public |

Les identifiants IP proviennent d’une connexion réseau, pas d’un en-tête client. Les en-têtes `Forwarded`, `X-Forwarded-*`, `X-Real-IP` et autres conventions d’adresse sont retirés par le relais Node ; il recrée uniquement XFF et le protocole réellement reçu. Host ne sélectionne pas l’upstream : `API_INTERNAL_ORIGIN`, configuration privée validée, est la seule destination. Pas de compte de sauts, réseau large, alias de confiance ou `true` dans `TRUST_PROXY`. Seules des IP exactes vérifiées sont acceptées. Deux clients réseau distincts conservent leurs quotas ; plusieurs utilisateurs derrière un même NAT peuvent naturellement partager une IP.

## Pourquoi remplacer le rewrite

Le routeur Next utilisé jusque-là ne fournissait pas une provenance TCP fiable au code de réécriture, et transmettait le XFF client. Une Route Handler basée sur `NextRequest` ou sur `headers()` ne rendrait pas cet en-tête fiable. Le point d’entrée Node minimal reçoit le socket avant Next et traite uniquement le relayage `/api/v1`; les autres requêtes passent au gestionnaire Next existant. Pas de nouvelle bibliothèque de proxy ou de calcul de quota dans le navigateur.

`pnpm dev:frontend` et `pnpm --filter @jokkodev/frontend start` utilisent ce serveur. `next start`/`next dev` seuls ne relaient plus l’API (404 au lieu d’une reprise silencieuse du rewrite vulnérable). `API_INTERNAL_ORIGIN` est lu **au démarrage**, plus fixé dans une réécriture au build ; les lectures serveur conservent leur configuration privée et transmission explicite du cookie. Le build reste `next build`. Les fichiers `server.mjs` et `server/api-relay.mjs` doivent accompagner la release ; ne pas activer `output: standalone`, incompatible avec ce serveur personnalisé sans travail complémentaire.

Le relais transmet les corps une seule fois en flux, préserve multipart/boundary, cookies multiples, Origin/CSRF, statuts et Retry-After ; ne suit pas les redirections et ne rejoue pas une mutation. Limites Nest inchangées (JSON 64 Kio, photo 2 Mio), en-têtes/temps réseau bornés ; erreur d’upstream générique sans URL, identifiant ou corps dans les logs du relais.

## Topologies exclues et préalables

Ne pas placer un autre proxy devant ce relais Node en lui demandant de retrouver une IP à partir d’en-têtes reçus. Il verrait uniquement l’adresse de ce proxy. Dans ce cas, utiliser le routage API direct du frontal nginx, ou faire approuver une autre frontière qui prouve l’adresse. Regrouper tout le trafic sous l’IP du proxy, mettre `TRUST_PROXY=false` derrière celui-ci ou choisir arbitrairement un nombre de sauts ne résout pas la séparation des quotas.

Nginx derrière CDN/load balancer : le modèle actuel ne prouve pas l’IP d’origine au-delà de son pair. Examiner les sources disponibles et configurer une frontière explicitement authentifiée/isolée avant activation ; aucun header CDN n’est automatiquement cru. Les ports Nest/Next ne doivent pas être accessibles aux clients non fiables dans un mode proxy. Les processus locaux et conteneurs pouvant joindre le loopback font partie de cette frontière système ; tester pare-feu/réseaux et rôles sur la cible. Les réglages privés `.env` existants ne sont pas modifiés automatiquement.

## Preuves

[Rapport lot 21](../security/lot21/rapport.md) : avant, cinq 401 puis 429 puis 401 à XFF changé ; après, variantes XFF/Forwarded multiples toujours 429. Deux véritables sources TCP 127.0.0.1/127.0.0.2 testées en direct et relayé ; deux clients réseau Docker distincts testés via nginx. Ces essais HTTP et le sous-ensemble Linux ne remplacent ni HTTPS SystaLink ni la validation de son isolation réseau.

Sources : [Express derrière un proxy](https://expressjs.com/en/guide/behind-proxies/), [serveur personnalisé Next](https://nextjs.org/docs/app/guides/custom-server).
