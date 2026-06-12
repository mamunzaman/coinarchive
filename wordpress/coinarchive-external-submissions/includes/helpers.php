<?php

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('caes_get_gemini_api_key')) {
    function caes_get_gemini_api_key() {
        if (!defined('CAES_GEMINI_API_KEY')) {
            return '';
        }

        return trim((string) CAES_GEMINI_API_KEY);
    }
}

if (!function_exists('caes_get_allowed_ai_description_fields')) {
    function caes_get_allowed_ai_description_fields() {
        return array(
            'obverse_description',
            'reverse_description',
            'historical_background',
            'collector_notes',
            'seo_description',
        );
    }
}

if (!function_exists('caes_get_ai_description_field_max_lengths')) {
    function caes_get_ai_description_field_max_lengths() {
        return array(
            'obverse_description'   => 1200,
            'reverse_description'   => 1200,
            'historical_background' => 1200,
            'collector_notes'       => 1200,
            'seo_description'       => 300,
        );
    }
}

if (!function_exists('caes_sanitize_ai_text_field')) {
    function caes_sanitize_ai_text_field($value, $max_length = 0) {
        $value = sanitize_textarea_field((string) $value);

        if ($max_length > 0 && strlen($value) > $max_length) {
            $value = substr($value, 0, $max_length);
        }

        return $value;
    }
}

if (!function_exists('caes_extract_json_object_from_text')) {
    function caes_extract_json_object_from_text($text) {
        $text = trim((string) $text);

        if ($text === '') {
            return null;
        }

        if (preg_match('/```(?:json)?\s*([\s\S]*?)```/i', $text, $matches)) {
            $text = trim((string) $matches[1]);
        }

        $decoded = json_decode($text, true);

        if (is_array($decoded)) {
            return $decoded;
        }

        if (preg_match('/\{[\s\S]*\}/', $text, $matches)) {
            $decoded = json_decode((string) $matches[0], true);

            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }
}

if (!function_exists('caes_normalize_ai_fields_requested')) {
    function caes_normalize_ai_fields_requested($fields_requested) {
        $allowed = caes_get_allowed_ai_description_fields();
        $fields  = array();

        if (!is_array($fields_requested)) {
            return $allowed;
        }

        foreach ($fields_requested as $field) {
            $field = sanitize_key((string) $field);

            if (in_array($field, $allowed, true)) {
                $fields[] = $field;
            }
        }

        return !empty($fields) ? array_values(array_unique($fields)) : $allowed;
    }
}

if (!function_exists('caes_normalize_ai_content_language')) {
    function caes_normalize_ai_content_language($language) {
        $language = strtolower(sanitize_key((string) $language));

        return $language === 'de' ? 'de' : 'en';
    }
}

if (!function_exists('caes_normalize_content_language')) {
    function caes_normalize_content_language($value) {
        $value = strtolower(sanitize_key((string) $value));

        return in_array($value, array('de', 'en'), true) ? $value : 'de';
    }
}

if (!function_exists('caes_get_content_language_label')) {
    function caes_get_content_language_label($lang) {
        $lang = caes_normalize_content_language($lang);

        return $lang === 'en' ? 'English' : 'Deutsch';
    }
}

if (!function_exists('caes_set_polylang_post_language')) {
    function caes_set_polylang_post_language($post_id, $content_language) {
        $post_id          = absint($post_id);
        $content_language = caes_normalize_content_language($content_language);

        if ($post_id <= 0 || !function_exists('pll_set_post_language')) {
            return false;
        }

        pll_set_post_language($post_id, $content_language);

        return true;
    }
}

if (!function_exists('caes_save_submission_content_language')) {
    function caes_save_submission_content_language($post_id, $content_language) {
        $post_id          = absint($post_id);
        $content_language = caes_normalize_content_language($content_language);

        if ($post_id <= 0) {
            return '';
        }

        update_post_meta($post_id, '_caes_content_language', $content_language);
        caes_set_polylang_post_language($post_id, $content_language);

        return $content_language;
    }
}

if (!function_exists('caes_get_ai_country_label')) {
    function caes_get_ai_country_label($country, $language = 'en') {
        $country  = sanitize_text_field((string) $country);
        $language = caes_normalize_ai_content_language($language);

        if ($language !== 'de') {
            return $country;
        }

        $map = array(
            'andorra'     => 'Andorra',
            'austria'     => 'Österreich',
            'belgium'     => 'Belgien',
            'croatia'     => 'Kroatien',
            'cyprus'      => 'Zypern',
            'estonia'     => 'Estland',
            'finland'     => 'Finnland',
            'france'      => 'Frankreich',
            'germany'     => 'Deutschland',
            'greece'      => 'Griechenland',
            'ireland'     => 'Irland',
            'italy'       => 'Italien',
            'latvia'      => 'Lettland',
            'lithuania'   => 'Litauen',
            'luxembourg'  => 'Luxemburg',
            'malta'       => 'Malta',
            'monaco'      => 'Monaco',
            'netherlands' => 'Niederlande',
            'portugal'    => 'Portugal',
            'san marino'  => 'San Marino',
            'slovakia'    => 'Slowakei',
            'slovenia'    => 'Slowenien',
            'spain'       => 'Spanien',
            'vatican'     => 'Vatikan',
        );

        $key = strtolower($country);

        return $map[$key] ?? $country;
    }
}

if (!function_exists('caes_sanitize_ai_descriptions_request')) {
    function caes_sanitize_ai_descriptions_request($params) {
        if (!is_array($params)) {
            $params = array();
        }

        $mint_data = $params['mint_data'] ?? '';

        if (is_array($mint_data)) {
            $mint_parts = array();

            foreach ($mint_data as $key => $value) {
                if (is_scalar($value) && (string) $value !== '') {
                    $mint_parts[] = sanitize_key((string) $key) . ': ' . sanitize_text_field((string) $value);
                }
            }

            $mint_data = implode('; ', $mint_parts);
        } else {
            $mint_data = sanitize_textarea_field((string) $mint_data);
        }

        return array(
            'country'          => sanitize_text_field((string) ($params['country'] ?? '')),
            'year'             => sanitize_text_field((string) ($params['year'] ?? '')),
            'denomination'     => sanitize_text_field((string) ($params['denomination'] ?? '')),
            'coin_type'        => sanitize_text_field((string) ($params['coin_type'] ?? '')),
            'theme'            => sanitize_textarea_field((string) ($params['theme'] ?? '')),
            'subject'          => sanitize_textarea_field((string) ($params['subject'] ?? '')),
            'release_date'     => sanitize_text_field((string) ($params['release_date'] ?? '')),
            'mint_data'        => $mint_data,
            'content_language' => caes_normalize_ai_content_language($params['content_language'] ?? 'en'),
            'language_instruction' => sanitize_textarea_field((string) ($params['language_instruction'] ?? '')),
            'prompt'           => sanitize_textarea_field((string) ($params['prompt'] ?? '')),
            'fields_requested' => caes_normalize_ai_fields_requested($params['fields_requested'] ?? array()),
        );
    }
}

if (!function_exists('caes_validate_ai_descriptions_request')) {
    function caes_validate_ai_descriptions_request($input) {
        $required = array('country', 'year', 'denomination', 'coin_type');

        foreach ($required as $field) {
            if (!is_array($input) || trim((string) ($input[$field] ?? '')) === '') {
                return new WP_Error(
                    'rest_missing_fields',
                    'Required fields: country, year, denomination, coin_type.',
                    array('status' => 400)
                );
            }
        }

        return $input;
    }
}

if (!function_exists('caes_build_ai_descriptions_prompt')) {
    function caes_build_ai_descriptions_prompt($input) {
        $fields = $input['fields_requested'];
        $schema = array();
        $language = caes_normalize_ai_content_language($input['content_language'] ?? 'en');
        $language_instruction = sanitize_textarea_field((string) ($input['language_instruction'] ?? ''));
        $custom_prompt = sanitize_textarea_field((string) ($input['prompt'] ?? ''));

        foreach ($fields as $field) {
            $schema[$field] = 'string';
        }

        $context = array(
            'country'      => $input['country'],
            'year'         => $input['year'],
            'denomination' => $input['denomination'],
            'coin_type'    => $input['coin_type'],
            'theme'        => $input['theme'],
            'subject'      => $input['subject'],
            'release_date' => $input['release_date'],
            'mint_data'    => $input['mint_data'],
            'content_language' => $language,
        );

        $hard_language_rule = $language === 'de'
            ? 'ANTWORTE AUSSCHLIESSLICH AUF DEUTSCH.' . "\n" . 'Keine englischen Sätze.' . "\n" . 'Alle Felder müssen deutsch sein.'
            : 'ANSWER ONLY IN ENGLISH.' . "\n" . 'Do not write German sentences.';

        $prompt = $hard_language_rule . "\n\n"
            . 'You are a professional numismatic catalog writer for CoinArchive.' . "\n"
            . 'Write concise, factual, SEO-friendly coin descriptions using only the provided data.' . "\n"
            . 'Rules:' . "\n"
            . '- Do not invent mintage, designer, mint mark, rarity, value, or historical facts.' . "\n"
            . '- If data is missing, use neutral wording and avoid speculation.' . "\n"
            . '- Return valid JSON only with these keys: ' . implode(', ', $fields) . '.' . "\n"
            . '- seo_description must be under 300 characters.' . "\n"
            . '- Other description fields should be concise catalog text.';

        if ($language_instruction !== '') {
            $prompt .= "\n" . 'Language instruction from request:' . "\n" . $language_instruction;
        }

        if ($custom_prompt !== '') {
            $prompt .= "\n" . 'Additional user prompt:' . "\n" . $custom_prompt;
        }

        return $prompt . "\n\n"
            . 'Coin data:' . "\n"
            . wp_json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n"
            . 'JSON schema example:' . "\n"
            . wp_json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

if (!function_exists('caes_get_ai_description_fallback')) {
    function caes_get_ai_description_fallback($field, $input) {
        $language = caes_normalize_ai_content_language($input['content_language'] ?? 'en');
        $country  = caes_get_ai_country_label($input['country'] ?? '', $language);
        $year     = sanitize_text_field((string) ($input['year'] ?? ''));
        $subject  = sanitize_text_field((string) ($input['subject'] ?? ''));

        if ($subject === '') {
            $subject = $language === 'de' ? 'das angegebene Thema' : 'the stated theme';
        }

        if ($language === 'de') {
            $templates = array(
                'obverse_description'   => sprintf('Die Vorderseite zeigt ein Gedenkmotiv zum Thema „%s“ für %s.', $subject, $country),
                'reverse_description'   => 'Die Rückseite zeigt die gemeinsame Wertseite der 2-Euro-Münze.',
                'historical_background' => sprintf('Der historische Hintergrund dieser Ausgabe bezieht sich auf das Thema „%s“. Weitere gesicherte Angaben sollten anhand offizieller Quellen ergänzt werden.', $subject),
                'collector_notes'       => sprintf('Diese 2-Euro-Gedenkmünze aus dem Jahr %s ist dem Thema „%s“ gewidmet. Für Sammler sind Erhaltungsgrad, Auflage, Prägestätte und vollständige Dokumentation besonders relevant.', $year, $subject),
                'seo_description'       => sprintf('%s %s: 2-Euro-Gedenkmünze zum Thema „%s“.', $country, $year, $subject),
            );
        } else {
            $templates = array(
                'obverse_description'   => sprintf('Features the commemorative design representing “%s” for %s.', $subject, $country),
                'reverse_description'   => 'Features the standard common side design of the 2 Euro coin.',
                'historical_background' => sprintf('This issue relates to “%s”. Add verified official details when available.', $subject),
                'collector_notes'       => sprintf('This %s commemorative coin from %s is dedicated to “%s”. Collectors should review condition, mintage, mint, and documentation.', $country, $year, $subject),
                'seo_description'       => sprintf('%s %s 2 Euro commemorative coin about “%s”.', $country, $year, $subject),
            );
        }

        return $templates[$field] ?? '';
    }
}

if (!function_exists('caes_sanitize_ai_descriptions_output')) {
    function caes_sanitize_ai_descriptions_output($decoded, $fields_requested, $input = array()) {
        if (!is_array($decoded)) {
            return null;
        }

        $max_lengths = caes_get_ai_description_field_max_lengths();
        $output      = array();

        foreach ($fields_requested as $field) {
            $value = $decoded[$field] ?? '';

            if (trim((string) $value) === '') {
                $value = caes_get_ai_description_fallback($field, $input);
            }

            $output[$field] = caes_sanitize_ai_text_field(
                $value,
                (int) ($max_lengths[$field] ?? 1200)
            );
        }

        return $output;
    }
}

if (!function_exists('caes_log_ai_debug')) {
    function caes_log_ai_debug($message) {
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            return;
        }

        error_log('[CAES AI] ' . (string) $message);
    }
}
