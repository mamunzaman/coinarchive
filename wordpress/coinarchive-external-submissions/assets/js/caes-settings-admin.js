(function ($) {
    var labels = window.caesSettingsAdmin || {};

    function updatePreview($input, attachment) {
        var $row = $input.closest('td');
        var $preview = $row.find('.caes-default-image-preview');
        var $idDisplay = $row.find('.caes-default-image-id-display');
        var attachmentId = attachment ? attachment.id : 0;
        var previewUrl = attachment && attachment.sizes && attachment.sizes.medium
            ? attachment.sizes.medium.url
            : (attachment ? attachment.url : '');

        $input.val(attachmentId);
        $idDisplay.text(String(attachmentId));

        if (previewUrl) {
            $preview.html(
                $('<img>', {
                    src: previewUrl,
                    alt: '',
                    css: { maxWidth: '240px', height: 'auto', display: 'block' }
                })
            );
        } else {
            $preview.html($('<em>').text(labels.noImage || 'No image selected.'));
        }
    }

    function openMediaFrame($input) {
        if (!window.wp || !wp.media) {
            return;
        }

        var frame = wp.media({
            title: labels.selectTitle || 'Select Default Image',
            button: { text: labels.selectButton || 'Use this image' },
            library: { type: 'image' },
            multiple: false
        });

        frame.on('select', function () {
            var attachment = frame.state().get('selection').first().toJSON();
            updatePreview($input, attachment);
        });

        frame.open();
    }

    $(document).on('click', '.caes-select-default-image, .caes-media-upload-button', function (event) {
        event.preventDefault();

        var targetId = $(this).data('target');
        var $input = $('#' + targetId);

        if (!$input.length) {
            return;
        }

        openMediaFrame($input);
    });

    $(document).on('click', '.caes-remove-default-image', function (event) {
        event.preventDefault();

        var targetId = $(this).data('target');
        var $input = $('#' + targetId);

        if (!$input.length) {
            return;
        }

        updatePreview($input, null);
    });
}(jQuery));
