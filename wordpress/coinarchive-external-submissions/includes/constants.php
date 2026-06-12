<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('CAES_VERSION')) {
    define('CAES_VERSION', '0.1.0');
}

if (!defined('COINARCHIVE_SUBMISSION_API_KEY')) {
    define('COINARCHIVE_SUBMISSION_API_KEY', 'local-dev-key-123');
}

if (!defined('CAES_FRONTEND_URL')) {
    define('CAES_FRONTEND_URL', '');
}

if (!function_exists('caes_get_frontend_url')) {
    function caes_get_frontend_url() {
        $url = defined('CAES_FRONTEND_URL') ? (string) CAES_FRONTEND_URL : '';

        return untrailingslashit(trim((string) apply_filters('caes_frontend_url', $url)));
    }
}

if (!function_exists('caes_maybe_log_empty_frontend_url')) {
    function caes_maybe_log_empty_frontend_url() {
        if (caes_get_frontend_url() !== '') {
            return;
        }

        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            return;
        }

        if (function_exists('caes_log_transactional_email_debug')) {
            caes_log_transactional_email_debug(
                'CAES_FRONTEND_URL is empty. Auth email action links will be unavailable until it is configured.'
            );
            return;
        }

        error_log('[CAES Email] CAES_FRONTEND_URL is empty. Auth email action links will be unavailable until it is configured.');
    }
}

add_action('plugins_loaded', 'caes_maybe_log_empty_frontend_url', 20);

if (!function_exists('caes_build_frontend_auth_url')) {
    function caes_build_frontend_auth_url($route, $query_args = array()) {
        $base_url = caes_get_frontend_url();

        if ($base_url === '') {
            return '';
        }

        $route = trim((string) $route, '/');

        if ($route === '') {
            return $base_url;
        }

        $url = $base_url . '/' . $route;

        if (!is_array($query_args) || empty($query_args)) {
            return $url;
        }

        $clean_args = array();

        foreach ($query_args as $key => $value) {
            $key = sanitize_key((string) $key);

            if ($key === '') {
                continue;
            }

            $clean_args[$key] = (string) $value;
        }

        if (empty($clean_args)) {
            return $url;
        }

        return $url . '?' . http_build_query($clean_args, '', '&', PHP_QUERY_RFC3986);
    }
}

if (!defined('CAES_EMAIL_FROM')) {
    define('CAES_EMAIL_FROM', '');
}

if (!defined('CAES_EMAIL_FROM_NAME')) {
    define('CAES_EMAIL_FROM_NAME', '');
}

if (!defined('CAES_GEMINI_API_KEY')) {
    define('CAES_GEMINI_API_KEY', '');
}
