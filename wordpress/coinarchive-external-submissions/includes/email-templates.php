<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_get_support_email_address')) {
    function caes_get_support_email_address() {
        return sanitize_email((string) apply_filters('caes_support_email', get_option('admin_email')));
    }
}

if (!function_exists('caes_log_missing_email_action_url')) {
    function caes_log_missing_email_action_url($context) {
        if (function_exists('caes_log_transactional_email_debug')) {
            caes_log_transactional_email_debug('Missing ' . sanitize_key((string) $context) . ' URL in email template.');
        }
    }
}

if (!function_exists('caes_build_email_action_button_html')) {
    function caes_build_email_action_button_html($url, $label) {
        $url   = trim((string) $url);
        $label = (string) $label;

        if ($url === '') {
            return '';
        }

        return sprintf(
            '<p style="margin:28px 0;"><a href="%1$s" style="background:#b8860b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block;font-weight:bold;">%2$s</a></p>',
            esc_url($url),
            esc_html($label)
        );
    }
}

if (!function_exists('caes_build_email_fallback_link_html')) {
    function caes_build_email_fallback_link_html($url, $context = 'action') {
        $url = trim((string) $url);

        if ($url === '') {
            caes_log_missing_email_action_url($context);

            return '<p style="font-size:14px;color:#4b5563;">' . esc_html__(
                'The link is unavailable. Please contact support for assistance.',
                'coinarchive-external-submissions'
            ) . '</p>';
        }

        return sprintf(
            '<p style="font-size:14px;color:#4b5563;">%1$s</p><p style="font-size:14px;color:#4b5563;word-break:break-all;"><a href="%2$s" style="color:#b8860b;">%3$s</a></p>',
            esc_html__('If the button does not work, copy and paste this link into your browser:', 'coinarchive-external-submissions'),
            esc_url($url),
            esc_html($url)
        );
    }
}

if (!function_exists('caes_get_frontend_login_url')) {
    function caes_get_frontend_login_url() {
        return caes_build_frontend_auth_url('login');
    }
}

if (!function_exists('caes_build_contributor_lifecycle_email_html')) {
    function caes_build_contributor_lifecycle_email_html($site_name, $heading, $greeting_name, $paragraphs, $extra_html = '') {
        $body_parts = array(
            sprintf(
                '<p>%1$s <strong>%2$s</strong>,</p>',
                esc_html__('Hello', 'coinarchive-external-submissions'),
                esc_html($greeting_name)
            ),
        );

        foreach ($paragraphs as $paragraph) {
            $body_parts[] = '<p>' . esc_html((string) $paragraph) . '</p>';
        }

        if ($extra_html !== '') {
            $body_parts[] = $extra_html;
        }

        return sprintf(
            '<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f2937;max-width:600px;margin:0 auto;padding:24px;">
                <div style="border-bottom:3px solid #b8860b;padding-bottom:16px;margin-bottom:24px;">
                    <h1 style="margin:0;font-size:24px;color:#111827;">%1$s</h1>
                    <p style="margin:8px 0 0;color:#6b7280;">%2$s</p>
                </div>
                %3$s
            </div>',
            esc_html($site_name),
            esc_html($heading),
            implode('', $body_parts)
        );
    }
}

if (!function_exists('caes_build_email_verified_pending_approval_email_content')) {
    function caes_build_email_verified_pending_approval_email_content($display_name) {
        $display_name  = sanitize_text_field((string) $display_name);
        $site_name     = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);
        $greeting_name = $display_name !== '' ? $display_name : __('there', 'coinarchive-external-submissions');
        $support_email = caes_get_support_email_address();

        $subject = __('Your email has been verified', 'coinarchive-external-submissions');

        $html_body = caes_build_contributor_lifecycle_email_html(
            $site_name,
            __('Email Verified', 'coinarchive-external-submissions'),
            $greeting_name,
            array(
                __('Your email address has been verified successfully.', 'coinarchive-external-submissions'),
                __('Your contributor account is now awaiting administrator approval.', 'coinarchive-external-submissions'),
                __('You will receive another email when your account has been approved.', 'coinarchive-external-submissions'),
                __('Please wait for approval before attempting to log in.', 'coinarchive-external-submissions'),
            ),
            sprintf(
                '<p style="font-size:14px;color:#6b7280;">%1$s <a href="mailto:%2$s" style="color:#b8860b;">%2$s</a>.</p>',
                esc_html__('Questions? Contact support at', 'coinarchive-external-submissions'),
                esc_html($support_email)
            )
        );

        return array(
            'subject'   => $subject,
            'html_body' => $html_body,
        );
    }
}

if (!function_exists('caes_build_account_approved_email_content')) {
    function caes_build_account_approved_email_content($display_name, $login_url) {
        $display_name  = sanitize_text_field((string) $display_name);
        $login_url     = trim((string) $login_url);
        $site_name     = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);
        $greeting_name = $display_name !== '' ? $display_name : __('there', 'coinarchive-external-submissions');
        $support_email = caes_get_support_email_address();
        $button_html   = caes_build_email_action_button_html(
            $login_url,
            __('Log In to CoinArchive', 'coinarchive-external-submissions')
        );
        $fallback_html = caes_build_email_fallback_link_html($login_url, 'login');

        $subject = __('Your contributor account has been approved', 'coinarchive-external-submissions');

        $html_body = caes_build_contributor_lifecycle_email_html(
            $site_name,
            __('Account Approved', 'coinarchive-external-submissions'),
            $greeting_name,
            array(
                __('Your contributor account has been approved.', 'coinarchive-external-submissions'),
                __('You can now log in and start using CoinArchive.', 'coinarchive-external-submissions'),
            ),
            $button_html . $fallback_html . sprintf(
                '<p style="font-size:14px;color:#6b7280;">%1$s <a href="mailto:%2$s" style="color:#b8860b;">%2$s</a>.</p>',
                esc_html__('Questions? Contact support at', 'coinarchive-external-submissions'),
                esc_html($support_email)
            )
        );

        return array(
            'subject'   => $subject,
            'html_body' => $html_body,
        );
    }
}

if (!function_exists('caes_build_account_rejected_email_content')) {
    function caes_build_account_rejected_email_content($display_name) {
        $display_name  = sanitize_text_field((string) $display_name);
        $site_name     = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);
        $greeting_name = $display_name !== '' ? $display_name : __('there', 'coinarchive-external-submissions');
        $support_email = caes_get_support_email_address();

        $subject = __('Your contributor account was not approved', 'coinarchive-external-submissions');

        $html_body = caes_build_contributor_lifecycle_email_html(
            $site_name,
            __('Account Not Approved', 'coinarchive-external-submissions'),
            $greeting_name,
            array(
                __('Thank you for your interest in contributing to CoinArchive.', 'coinarchive-external-submissions'),
                __('Your contributor account was not approved at this time.', 'coinarchive-external-submissions'),
                __('If you believe this was a mistake or would like more information, please contact our support team.', 'coinarchive-external-submissions'),
            ),
            sprintf(
                '<p style="font-size:14px;color:#6b7280;">%1$s <a href="mailto:%2$s" style="color:#b8860b;">%2$s</a>.</p>',
                esc_html__('Contact support at', 'coinarchive-external-submissions'),
                esc_html($support_email)
            )
        );

        return array(
            'subject'   => $subject,
            'html_body' => $html_body,
        );
    }
}

if (!function_exists('caes_get_contributor_notification_record')) {
    function caes_get_contributor_notification_record($contributor_id) {
        if (function_exists('caes_get_contributor_auth_record')) {
            return caes_get_contributor_auth_record($contributor_id);
        }

        return caes_get_contributor_record($contributor_id);
    }
}

if (!function_exists('caes_send_contributor_notification_email')) {
    function caes_send_contributor_notification_email($contributor_id, $email_content, $context) {
        $contributor = caes_get_contributor_notification_record($contributor_id);

        if (empty($contributor) || !is_email($contributor->email)) {
            return false;
        }

        $sent = caes_send_transactional_email(
            $contributor->email,
            $email_content['subject'],
            $email_content['html_body']
        );

        if (is_wp_error($sent) || $sent !== true) {
            if (function_exists('caes_log_transactional_email_debug')) {
                $code = is_wp_error($sent) ? $sent->get_error_code() : 'send_failed';
                caes_log_transactional_email_debug('Contributor ' . sanitize_key((string) $context) . ' notification failed: ' . $code);
            }

            return false;
        }

        return true;
    }
}

if (!function_exists('caes_send_email_verified_pending_approval_notification')) {
    function caes_send_email_verified_pending_approval_notification($contributor_id) {
        $contributor = caes_get_contributor_notification_record($contributor_id);

        if (empty($contributor) || (int) ($contributor->email_verified ?? 0) !== 1) {
            return false;
        }

        if (($contributor->status ?? '') !== 'pending_approval') {
            return false;
        }

        return caes_send_contributor_notification_email(
            $contributor_id,
            caes_build_email_verified_pending_approval_email_content($contributor->display_name),
            'email_verified_pending_approval'
        );
    }
}

if (!function_exists('caes_send_contributor_approved_notification')) {
    function caes_send_contributor_approved_notification($contributor_id) {
        $contributor = caes_get_contributor_notification_record($contributor_id);

        if (empty($contributor) || (int) ($contributor->email_verified ?? 0) !== 1) {
            return false;
        }

        if (($contributor->status ?? '') !== 'approved') {
            return false;
        }

        return caes_send_contributor_notification_email(
            $contributor_id,
            caes_build_account_approved_email_content(
                $contributor->display_name,
                caes_get_frontend_login_url()
            ),
            'approved'
        );
    }
}

if (!function_exists('caes_send_contributor_rejected_notification')) {
    function caes_send_contributor_rejected_notification($contributor_id) {
        $contributor = caes_get_contributor_notification_record($contributor_id);

        if (empty($contributor) || ($contributor->status ?? '') !== 'rejected') {
            return false;
        }

        return caes_send_contributor_notification_email(
            $contributor_id,
            caes_build_account_rejected_email_content($contributor->display_name),
            'rejected'
        );
    }
}

if (!function_exists('caes_get_email_verification_url')) {
    function caes_get_email_verification_url($raw_token, $email) {
        return caes_build_frontend_auth_url('verify-email', array(
            'email' => sanitize_email((string) $email),
            'token' => (string) $raw_token,
        ));
    }
}

if (!function_exists('caes_build_verification_email_content')) {
    function caes_build_verification_email_content($display_name, $verification_url) {
        $display_name     = sanitize_text_field((string) $display_name);
        $verification_url = trim((string) $verification_url);
        $support_email    = caes_get_support_email_address();
        $site_name        = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);
        $greeting_name    = $display_name !== '' ? $display_name : __('there', 'coinarchive-external-submissions');
        $button_html      = caes_build_email_action_button_html(
            $verification_url,
            __('Verify Email Address', 'coinarchive-external-submissions')
        );
        $fallback_html    = caes_build_email_fallback_link_html($verification_url, 'verification');

        $subject = sprintf(
            /* translators: %s: site name */
            __('Verify your %s contributor account', 'coinarchive-external-submissions'),
            $site_name
        );

        $text_body = sprintf(
            "Hello %s,\n\nWelcome to %s.\n\nPlease verify your email address to activate your contributor account:\n%s\n\nThis link expires in 24 hours.\n\nIf you did not create this account, you can ignore this email.\n\nNeed help? Contact us at %s.\n\n— %s",
            $greeting_name,
            $site_name,
            $verification_url,
            $support_email,
            $site_name
        );

        $html_body = sprintf(
            '<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f2937;max-width:600px;margin:0 auto;padding:24px;">
                <div style="border-bottom:3px solid #b8860b;padding-bottom:16px;margin-bottom:24px;">
                    <h1 style="margin:0;font-size:24px;color:#111827;">%1$s</h1>
                    <p style="margin:8px 0 0;color:#6b7280;">%2$s</p>
                </div>
                <p>%3$s <strong>%4$s</strong>,</p>
                <p>%5$s</p>
                %6$s
                %7$s
                <p style="font-size:14px;color:#6b7280;">%8$s</p>
                <p style="font-size:14px;color:#6b7280;">%9$s <a href="mailto:%10$s" style="color:#b8860b;">%10$s</a>.</p>
            </div>',
            esc_html($site_name),
            esc_html__('Contributor Account Verification', 'coinarchive-external-submissions'),
            esc_html__('Hello', 'coinarchive-external-submissions'),
            esc_html($greeting_name),
            esc_html__('Thanks for registering with CoinArchive. Please confirm your email address to continue account activation.', 'coinarchive-external-submissions'),
            $button_html,
            $fallback_html,
            esc_html__('This verification link expires in 24 hours.', 'coinarchive-external-submissions'),
            esc_html__('Questions? Contact support at', 'coinarchive-external-submissions'),
            esc_html($support_email)
        );

        return array(
            'subject'   => $subject,
            'text_body' => $text_body,
            'html_body' => $html_body,
        );
    }
}

if (!function_exists('caes_get_password_reset_url')) {
    function caes_get_password_reset_url($raw_token, $email) {
        return caes_build_frontend_auth_url('reset-password', array(
            'email' => sanitize_email((string) $email),
            'token' => (string) $raw_token,
        ));
    }
}

if (!function_exists('caes_build_password_reset_email_content')) {
    function caes_build_password_reset_email_content($display_name, $reset_url) {
        $display_name  = sanitize_text_field((string) $display_name);
        $reset_url     = trim((string) $reset_url);
        $support_email = caes_get_support_email_address();
        $site_name     = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);
        $greeting_name = $display_name !== '' ? $display_name : __('there', 'coinarchive-external-submissions');
        $button_html   = caes_build_email_action_button_html(
            $reset_url,
            __('Reset Password', 'coinarchive-external-submissions')
        );
        $fallback_html = caes_build_email_fallback_link_html($reset_url, 'password_reset');

        $subject = sprintf(
            /* translators: %s: site name */
            __('Reset your %s password', 'coinarchive-external-submissions'),
            $site_name
        );

        $html_body = sprintf(
            '<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f2937;max-width:600px;margin:0 auto;padding:24px;">
                <div style="border-bottom:3px solid #b8860b;padding-bottom:16px;margin-bottom:24px;">
                    <h1 style="margin:0;font-size:24px;color:#111827;">%1$s</h1>
                    <p style="margin:8px 0 0;color:#6b7280;">%2$s</p>
                </div>
                <p>%3$s <strong>%4$s</strong>,</p>
                <p>%5$s</p>
                %6$s
                %7$s
                <p style="font-size:14px;color:#6b7280;">%8$s</p>
                <p style="font-size:14px;color:#6b7280;">%9$s <a href="mailto:%10$s" style="color:#b8860b;">%10$s</a>.</p>
            </div>',
            esc_html($site_name),
            esc_html__('Password Reset Request', 'coinarchive-external-submissions'),
            esc_html__('Hello', 'coinarchive-external-submissions'),
            esc_html($greeting_name),
            esc_html__('We received a request to reset your CoinArchive contributor password. Use the button below to choose a new password.', 'coinarchive-external-submissions'),
            $button_html,
            $fallback_html,
            esc_html__('This password reset link expires in 1 hour.', 'coinarchive-external-submissions'),
            esc_html__('If you did not request this, you can ignore this email. Questions? Contact support at', 'coinarchive-external-submissions'),
            esc_html($support_email)
        );

        return array(
            'subject'   => $subject,
            'html_body' => $html_body,
        );
    }
}

if (!function_exists('caes_send_html_email')) {
    function caes_send_html_email($to, $subject, $html_body, $text_body = '') {
        $result = caes_send_transactional_email($to, $subject, $html_body);

        if (is_wp_error($result)) {
            return false;
        }

        return $result === true;
    }
}
