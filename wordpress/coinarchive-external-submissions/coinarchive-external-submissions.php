<?php
/**
 * Plugin Name: CoinArchive External Submissions
 * Description: Secure external submission API for CoinArchive coin CPT and ACF fields.
 * Version: 0.1.0
 * Author: Mamun
 */

if (!defined('ABSPATH')) {
    exit;
}

define('CAES_PLUGIN_FILE', __FILE__);
define('CAES_PLUGIN_DIR', plugin_dir_path(__FILE__));

require_once CAES_PLUGIN_DIR . 'includes/constants.php';
require_once CAES_PLUGIN_DIR . 'includes/install.php';
require_once CAES_PLUGIN_DIR . 'includes/settings.php';
require_once CAES_PLUGIN_DIR . 'includes/security.php';
require_once CAES_PLUGIN_DIR . 'includes/helpers.php';
require_once CAES_PLUGIN_DIR . 'includes/uploads.php';
require_once CAES_PLUGIN_DIR . 'includes/api.php';
require_once CAES_PLUGIN_DIR . 'includes/acf-fields.php';
require_once CAES_PLUGIN_DIR . 'includes/hooks.php';
require_once CAES_PLUGIN_DIR . 'includes/submission-logs.php';
require_once CAES_PLUGIN_DIR . 'includes/submissions.php';
require_once CAES_PLUGIN_DIR . 'includes/admin-submissions.php';
require_once CAES_PLUGIN_DIR . 'includes/import-coins.php';
require_once CAES_PLUGIN_DIR . 'includes/contributors.php';
require_once CAES_PLUGIN_DIR . 'includes/auth.php';
require_once CAES_PLUGIN_DIR . 'includes/email-delivery.php';
require_once CAES_PLUGIN_DIR . 'includes/email-templates.php';
require_once CAES_PLUGIN_DIR . 'includes/auth-rate-limit.php';
require_once CAES_PLUGIN_DIR . 'includes/auth-session.php';
require_once CAES_PLUGIN_DIR . 'includes/auth-email-verification.php';
require_once CAES_PLUGIN_DIR . 'includes/auth-password-reset.php';
require_once CAES_PLUGIN_DIR . 'includes/admin-contributors.php';
require_once CAES_PLUGIN_DIR . 'includes/rest-routes.php';

register_activation_hook(CAES_PLUGIN_FILE, 'caes_activate_plugin');
add_action('plugins_loaded', 'caes_maybe_upgrade_database', 5);
