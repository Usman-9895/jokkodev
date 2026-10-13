# Composants UI

Primitives du lot 1 : Button, ActionLink, TextField, TextArea, SelectField, Card, TechnologyBadge, StatusBadge, Message, Avatar, Spinner, LoadingIndicator, Skeleton, Heading et Icon. Exports regroupés dans index.ts ; Container et Brand restent dans components/layout/.

Tokens centralisés dans styles/tokens.css et styles communs dans styles/components.css, importés par globals.css. Documentation d’utilisation : docs/frontend/design-system.md. Catalogue local : /dev/design-system, uniquement avec next dev ; 404 en production, absent de la navigation publique.

Pas de kit externe, gestionnaire d’état global, contrat métier ou requête API. Les primitives restent compatibles avec les composants serveur ; les interactions de démonstration sont isolées dans la page d’aperçu cliente.
