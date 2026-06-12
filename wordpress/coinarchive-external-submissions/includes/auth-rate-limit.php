<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_get_request_client_ip')) {
    function caes_get_request_client_ip() {
        $ip = '';

        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $parts = explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR']);
            $ip    = trim((string) $parts[0]);
        } elseif (!empty($_SERVER['REMOTE_ADDR'])) {
            $ip = (string) $_SERVER['REMOTE_ADDR'];
        }

        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return '0.0.0.0';
        }

        return $ip;
    }
}

if (!function_exists('caes_build_rate_limit_transient_key')) {
    function caes_build_rate_limit_transient_key($action, $email = '') {
        $action = sanitize_key((string) $action);
        $email  = strtolower(sanitize_email((string) $email));
        $ip     = caes_get_request_client_ip();
        $hash   = hash('sha256', $action . '|' . $ip . '|' . $email);

        return 'caes_rl_' . $action . '_' . $hash;
    }
}

if (!function_exists('caes_auth_rate_limit_response')) {
    function caes_auth_rate_limit_response() {
        return new WP_REST_Response(array(
            'success' => false,
            'code'    => 'RATE_LIMITED',
            'message' => 'Too many attempts. Please try again later.',
        ), 429);
    }
}

if (!function_exists('caes_is_rate_limited')) {
    function caes_is_rate_limited($action, $email, $max_attempts, $window_seconds) {
        $key   = caes_build_rate_limit_transient_key($action, $email);
        $count = (int) get_transient($key);

        return $count >= (int) $max_attempts;
    }
}

if (!function_exists('caes_record_rate_limit_attempt')) {
    function caes_record_rate_limit_attempt($action, $email, $window_seconds) {
        $key   = caes_build_rate_limit_transient_key($action, $email);
        $count = (int) get_transient($key);

        set_transient($key, $count + 1, (int) $window_seconds);
    }
}

if (!function_exists('caes_enforce_auth_rate_limit')) {
    function caes_enforce_auth_rate_limit($action, $email, $max_attempts, $window_seconds) {
        if (caes_is_rate_limited($action, $email, $max_attempts, $window_seconds)) {
            return caes_auth_rate_limit_response();
        }

        caes_record_rate_limit_attempt($action, $email, $window_seconds);

        return null;
    }
}
