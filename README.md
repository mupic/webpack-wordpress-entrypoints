# webpack-wordpress-entrypoints
Generates a file for including scripts

### install
`npm i -D webpack-wordpress-entrypoints`

### Use
    const webpackWpEntrypoints = require('webpack-wordpress-entrypoints');

    const extractSass = new MiniCssExtractPlugin({
        filename: './css/[name].css',
    });
    module.exports = (env, argv) => {

        return {
            entry: {
                //The queue specified here affects the output.
                "first": [jsPath + 'first.js'],
                "second": [jsPath + 'second.js'],
                "last": [jsPath + 'last.js'],
            },
            output: {
                path: './dist/',
                filename: 'js/[name].js',
            },
            plugins: [
                extractSass,
                new webpackWpEntrypoints({
                    type: 'wp', //Default: wp. If you specify "json" here, the output will be in json format
                    path: './', //Main directory where are the theme of the site. Default: './';
                    filename: 'wwe_entrypoints.php', //You can specify the path to save the file. The file will be saved in the directory: path + filename. Default: wwe_entrypoints.php
                    chunkOptions: {
                        "first": {
                            registerHandleScript: '', //Used for the first argument to the wp_register_script function.
                            registerHandleStyle: '', //Used for the first argument to the wp_register_style function.
                            dependence: ['second'], //Sets the dependency of this script on another
                            dependenceCss: [], //Sets the dependency of this style on another
                            async: true, //Set the async attribute for this file only.
                            defer: false, //defer and async cannot be installed together, only async will be used
                            footer: true, //Put the script at the bottom of the wordpress site
                            admin: true, //Include the script to the wordpress admin panel
                            adminCss: null, //Include the style to the wordpress admin panel. Default: same as admin
                            gutenberg: false, //Include the script to the gutenberg editor
                            gutenbergCss: name, //Include the style to the gutenberg editor. Default: same as gutenberg
                            theme: true, //Include the script to the site theme
                            themeCss: null, //Include the style to the site theme. Default: same as theme
                            excludeScripts: false, //true - Excludes script output. Inherits the value of the main option.
                            excludeStyles: false, //true - Excludes style output. Inherits the value of the main option.
                        },
                    },
                    customFiles: { //You can connect your own custom scripts.
                        js: [
                            {
                                src: devMode? `http://localhost:${WPConfig.proxy.port}/browser-sync/browser-sync-client.js` : false, //In this example, we have a condition that is triggered only during development modes. If you specify false, then the script will not be included.
                                handle: false, //If not set, a hash from src will be generated.
                                dependence: undefined, //Inherits the value of the main option. 
                                gutenberg: null, //Inherits the value of the main option.
                                admin: null, //Inherits the value of the main option.
                                theme: null, //Inherits the value of the main option.
                                async: null, //Inherits the value of the main option.
                                footer: null, //Inherits the value of the main option.
                            },
                        ],
                        css: []
                    },
                    dependence: ['jquery'], //Sets the dependence of all scripts on the specified. Default: [].
                    dependenceCss: [], //Sets the dependence of all styles on the specified. Default: [].
                    async: false, //Set the async attribute for all files. Default: false.
                    defer: true, //defer and async cannot be installed together, only async will be used. Default: true.
                    footer: true, //Put scripts at the bottom of the wordpress site. Default: true.
                    admin: false, //Include scripts to the wordpress admin panel. Default: false.
                    adminCss: null, //Include styles to the wordpress admin panel. Default: same as admin
                    gutenberg: false, //Include the script to the gutenberg editor
                    gutenbergCss: name, //Include the style to the gutenberg editor. Default: same as gutenberg
                    theme: true, //Include scripts to the site theme. Default: true.
                    themeCss: null, //Include styles to the site theme. Default: same as theme
                    excludeScripts: false, //true - Exclude all scripts from output
                    excludeStyles: false, //true - Exclude all styles from output
                }),
            ],
            optimization: {
                splitChunks: {
                    chunks(chunk) {
                        return chunk.name !== 'first'; //Excludes the creation of chunks for this output.
                    },
                    minSize: 30000,
                    maxAsyncRequests: 20,
                }
            },
        };
    };
    
## Output result
### type=wp
    <?php
    $wwe_template_directory_uri = !empty($wwe_template_directory_uri)? $wwe_template_directory_uri : get_template_directory_uri();
    add_filter( "script_loader_tag", function( $tag, $handle ){
        if($handle == "build"){
            return str_replace( " src", " defer src", $tag );
        }
        if($handle == "gutenberg.js.bundle"){
            return str_replace( " src", " defer src", $tag );
        }
        if($handle == "gutenberg"){
            return str_replace( " src", " defer src", $tag );
        }
        return $tag;
    }, 10, 2 );
    add_action( 'wp_enqueue_scripts', function() use($wwe_template_directory_uri){
        do_action('wwe_wp_enqueue_scripts_before');
        wp_register_script('gutenberg.js.bundle', $wwe_template_directory_uri . '/_dist/js/gutenberg.js.bundle.js', array('jquery'), null, true );
        wp_register_script('build', $wwe_template_directory_uri . '/_dist/js/build.ddca7998b98c837c58eb.js', array('gutenberg.js.bundle','jquery'), null, true );
        wp_enqueue_script('build');
        wp_register_style('gutenberg.js.bundle', $wwe_template_directory_uri . '/_dist/css/gutenberg.js.bundle.css', array(), null );
        wp_register_style('build.ddca7998b98c837c58eb', $wwe_template_directory_uri . '/_dist/css/build.ddca7998b98c837c58eb.css', array(), null );
        wp_register_style('gutenberg', $wwe_template_directory_uri . '/theme_plugins/gutenberg/dist/css/gutenberg.css', array(), null );
        wp_enqueue_style('gutenberg.js.bundle');
        wp_enqueue_style('build.ddca7998b98c837c58eb');
        wp_enqueue_style('gutenberg');
        do_action('wwe_wp_enqueue_scripts_after');
    });
    add_action( 'enqueue_block_editor_assets', function() use($wwe_template_directory_uri){
        do_action('wwe_enqueue_block_editor_assets_before');
        wp_register_script('gutenberg', $wwe_template_directory_uri . '/theme_plugins/gutenberg/dist/js/gutenberg.ddca7998b98c837c58eb.js', array('jquery'), null, true );
        wp_enqueue_script('gutenberg');
        wp_register_style('gutenberg', $wwe_template_directory_uri . '/theme_plugins/gutenberg/dist/css/gutenberg.css', array(), null );
        wp_enqueue_style('gutenberg');
        do_action('wwe_enqueue_block_editor_assets_after');
    });



### type=json
    {
      "scripts": [
        {
          "name": "build",
          "file": "_dist/js/build.ddca7998b98c837c58eb.js",
          "dependent": [
            {
              "file": "_dist/js/gutenberg.js.bundle.js",
              "name": "gutenberg.js.bundle",
              "customDependent": [
                "jquery"
              ],
              "defer": true,
              "footer": true
            }
          ],
          "customDependent": [
            "jquery"
          ],
          "async": false,
          "defer": true,
          "footer": true,
          "admin": false,
          "gutenberg": false,
          "theme": true
        },
        {
          "name": "gutenberg",
          "file": "theme_plugins/gutenberg/dist/js/gutenberg.ddca7998b98c837c58eb.js",
          "dependent": [],
          "customDependent": [
            "jquery"
          ],
          "async": false,
          "defer": true,
          "footer": true,
          "admin": false,
          "gutenberg": true,
          "theme": false
        }
      ],
      "styles": [
        {
          "file": "_dist/css/gutenberg.js.bundle.css",
          "name": "gutenberg.js.bundle",
          "customDependent": [],
          "admin": false,
          "gutenberg": false,
          "theme": true
        },
        {
          "file": "_dist/css/build.ddca7998b98c837c58eb.css",
          "name": "build.ddca7998b98c837c58eb",
          "customDependent": [],
          "admin": false,
          "gutenberg": false,
          "theme": true
        },
        {
          "file": "theme_plugins/gutenberg/dist/css/gutenberg.css",
          "name": "gutenberg",
          "customDependent": [],
          "admin": false,
          "gutenberg": true,
          "theme": true
        }
      ]
    }