<?php

return [
    'link' => [
        'label' => 'Link',

        'modal' => [
            'heading' => 'Link',

            'form' => [
                'url' => 'URL',
                'should_open_in_new_tab' => 'Open in new tab',
                'url_invalid' => 'Links can only use these schemes: :protocols.',
            ],
        ],
    ],

    'html_source' => [
        'label' => 'HTML source',

        'modal' => [
            'heading' => 'HTML source',
            'submit' => 'Apply',
        ],
    ],

    'table' => [
        'insert_table' => [
            'label' => 'Insert table',

            'modal' => [
                'heading' => 'Insert table',

                'form' => [
                    'rows' => 'Rows',
                    'columns' => 'Columns',
                    'with_header_row' => 'Header row',
                ],
            ],
        ],
    ],
];
