<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_get_transactional_email_from')) {
    function caes_get_transactional_email_from() {
        $from = defined('CAES_EMAIL_FROM') ? (string) CAES_EMAIL_FROM : '';

        if ($from === '') {
            $from = (string) get_option('admin_email');
        }

        return sanitize_email((string) apply_filters('caes_email_from', $from));
    }
}

if (!function_exists('caes_get_transactional_email_from_name')) {
    function caes_get_transactional_email_from_name() {
        $from_name = defined('CAES_EMAIL_FROM_NAME') ? (string) CAES_EMAIL_FROM_NAME : '';

        if ($from_name === '') {
            $from_name = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);
        }

        return sanitize_text_field((string) apply_filters('caes_email_from_name', $from_name));
    }
}

if (!function_exists('caes_log_transactional_email_debug')) {
    function caes_log_transactional_email_debug($message) {
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            return;
        }

        error_log('[CAES Email] ' . (string) $message);
    }
}

if (!function_exists('caes_build_transactional_email_headers')) {
    function caes_build_transactional_email_headers($extra_headers = array()) {
        $headers   = array('Content-Type: text/html; charset=UTF-8');
        $from      = caes_get_transactional_email_from();
        $from_name = caes_get_transactional_email_from_name();

        if (is_email($from)) {
            if ($from_name !== '') {
                $headers[] = 'From: ' . sprintf('%s <%s>', $from_name, $from);
            } else {
                $headers[] = 'From: ' . $from;
            }
        }

        if (!is_array($extra_headers)) {
            return $headers;
        }

        foreach ($extra_headers as $header) {
            $header = sanitize_text_field((string) $header);

            if ($header !== '') {
                $headers[] = $header;
            }
        }

        return $headers;
    }
}

if (!function_exists('caes_send_via_wp_mail')) {
    function caes_send_via_wp_mail($to, $subject, $html, $headers = array()) {
        $to      = sanitize_email((string) $to);
        $subject = wp_strip_all_tags((string) $subject);
        $html    = (string) $html;

        if (!is_email($to)) {
            return new WP_Error('caes_invalid_recipient', 'Invalid recipient email address.');
        }

        if ($subject === '' || $html === '') {
            return new WP_Error('caes_invalid_email_content', 'Email subject and HTML content are required.');
        }

        $sent = wp_mail($to, $subject, $html, caes_build_transactional_email_headers($headers));

        if (!$sent) {
            caes_log_transactional_email_debug('wp_mail delivery failed for ' . $to);

            return new WP_Error(
                'caes_wp_mail_failed',
                'Transactional email could not be delivered via wp_mail.'
            );
        }

        return true;
    }
}

if (!function_exists('caes_send_transactional_email')) {
    function caes_send_transactional_email($to, $subject, $html, $headers = array()) {
        return caes_send_via_wp_mail($to, $subject, $html, $headers);
    }
}
