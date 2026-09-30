# Tranzit

Transport and courier platform: a Laravel API and an Expo (React Native) app.

## Layout

| Path      | Stack                             | Notes                        |
| --------- | --------------------------------- | ---------------------------- |
| `backend/` | Laravel (PHP) API + MySQL        | REST API under `/api/v1`      |
| `mobile/`  | Expo SDK 57, React Native, expo-router | Customer and driver app |

Design source lives in the `Figma Desgin */` folders and `Logo/`.

## Getting started

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

### Mobile

```bash
cd mobile
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL to your backend
npm start
```

On an Android emulator the API URL is `http://10.0.2.2:8000`; on a physical
device use your machine's LAN IP.

## Configuration

Only `.env.example` files are committed. Real `.env` files, `backend/vendor/`,
and `node_modules/` are ignored. See `.gitignore`.

## Tests

```bash
cd backend && php artisan test
```
