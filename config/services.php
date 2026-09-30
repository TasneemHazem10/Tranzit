<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        // Enable Google Places for accurate Egyptian address search:
        // 1. Google Cloud Console -> your project -> APIs & Services -> enable "Places API (New)"
        // 2. Create an API key (restrict to Places API if you like) and paste it below.
        'places_api_key' => env('GOOGLE_PLACES_API_KEY', ''),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'paymob' => [
        'api_key' => env('PAYMOB_API_KEY', ''),
        'integration_id' => env('PAYMOB_INTEGRATION_ID', ''),
        'iframe_id' => env('PAYMOB_IFRAME_ID', ''),
    ],

    'twilio' => [
        'sid' => env('TWILIO_SID', ''),
        'auth_token' => env('TWILIO_AUTH_TOKEN', ''),
        'from' => env('TWILIO_FROM', ''),
    ],

];
