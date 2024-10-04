
# webpack-wordpress-entrypoints
Generates a file for including scripts

### install
`npm i -D webpack-wordpress-entrypoints`

### Use
```js
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
                dependentHandleNameTemplate: '{{name}}~{{i}}~{{file}}', //Applies only to dependent scripts. {{name}} - handle name. {{file}} - file name. {{i}} - the number of scenarios of current entry points
                dependentHandleStyleNameTemplate: '', //Applies only to dependent scripts and styles. Inherited from dependentHandleNameTemplate, if it is empty. {{name}} - handle name. {{file}} - file name. {{i}} - the number of scenarios of current entry points
                entryOptions: {
                    "first": {
                        registerHandleScript: '', //Used for the first argument to the wp_register_script function.
                        registerHandleStyle: '', //Used for the first argument to the wp_register_style function.
                        dependentHandleNameTemplate: '', //Inherited from the main setting.
                        dependentHandleStyleNameTemplate: '', //Inherited from the main setting.
                        dependence: ['second'], //Sets the dependency of this script on another
                        dependenceCss: [], //Sets the dependency of this style on another
                        async: true, //Set the async attribute for this file only.
                        defer: false, //defer and async cannot be installed together, only async will be used
                        footer: true, //Put the script at the bottom of the wordpress site. If set to null, it will only register the script, but not enable it.
                        admin: true, //Include the script to the wordpress admin panel. If set to null, it will only register the script, but not enable it.
                        adminCss: undefined, //Include the style to the wordpress admin panel. If set to null, it will only register the script, but not enable it. Default: same as admin
                        gutenberg: false, //Include the script to the gutenberg editor. If set to null, it will only register the script, but not enable it.
                        gutenbergCss: name, //Include the style to the gutenberg editor. If set to null, it will only register the script, but not enable it. Default: same as gutenberg
                        theme: true, //Include the script to the site theme. If set to null, it will only register the script, but not enable it.
                        themeCss: undefined, //Include the style to the site theme. If set to null, it will only register the script, but not enable it. Default: same as theme
                        excludeScripts: false, //true - Excludes script output. Inherits the value of the main option.
                        excludeStyles: false, //true - Excludes style output. Inherits the value of the main option.
                    },
                },
                criticalStyles: [ //The order of connecting styles depends on the order in which you specify the objects.
                     {
                          test: /critical\..*\.css/, //regexp or function, false - skip. The function receives 3 arguments: fileName, content, info - object with information about the file (only since webpack version >= 5).
                          theme: true, //Does not inherit the values of the main options.
                          admin: false, //Does not inherit the values of the main options.
                          gutenberg: false, //Does not inherit the values of the main options.
                          footer: false, //Does not inherit the values of the main options. Works with theme only.
                          conditions: `is_front_page() || is_archive()`, //wordpress functions are inserted into the "if ({{conditions}})" check condition
                          variableTemplate: undefined, //Template for generating output of styles: {{styles}} - inserts a variable with styles.
                          registerHandleStyle: null, //If set, automatic inclusion on the page will be skipped.
                     }
                ],
                customFiles: { //You can connect your own custom scripts.
                    js: [
                        {
                            src: devMode? `http://localhost:${WPConfig.proxy.port}/browser-sync/browser-sync-client.js` : false, //In this example, we have a condition that is triggered only during development modes. If you specify false, then the script will not be included.
                            handle: false, //If not set, a hash from src will be generated.
                            dependence: undefined, //Inherits the value of the main option. 
                            gutenberg: undefined, //Inherits the value of the main option.
                            admin: undefined, //Inherits the value of the main option.
                            theme: undefined, //Inherits the value of the main option.
                            async: undefined, //Inherits the value of the main option.
                            footer: undefined, //Inherits the value of the main option.
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
                adminCss: undefined, //Include styles to the wordpress admin panel. Default: same as admin
                gutenberg: false, //Include the script to the gutenberg editor
                gutenbergCss: name, //Include the style to the gutenberg editor. Default: same as gutenberg
                theme: true, //Include scripts to the site theme. Default: true.
                themeCss: undefined, //Include styles to the site theme. Default: same as theme
                excludeScripts: false, //true - Exclude scripts from code generation.
                excludeStyles: false, //true - Exclude styles from code generation.
            }),
        ],
        optimization: {
            splitChunks: {
               cacheGroups: {
                   criticalStyles: { //For this setting to work, the required styles are required to be included as js modules. For example index.js -> import './src/css/some.critical.scss';
                       name: "critical",
                       chunks: "all",
                       test: (module) => {
                           return /critical\.scss/.test(module._identifier);
                       },
                       priority: 20,
                       maxSize: 99999999,
                       enforce: true,
                   }
               },
           }
        },
    };
};
```

## Output result
### type=wp
Roughly generated code, this code is unrelated to the above configuration.

```php
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
    wp_register_script('gutenberg.js.bundle', $wwe_template_directory_uri . '/_dist/js/gutenberg.js.bundle.js', array('jquery'), undefined, true );
    wp_register_script('build', $wwe_template_directory_uri . '/_dist/js/build.ddca7998b98c837c58eb.js', array('gutenberg.js.bundle','jquery'), undefined, true );
    wp_enqueue_script('build');
    wp_register_style('gutenberg.js.bundle', $wwe_template_directory_uri . '/_dist/css/gutenberg.js.bundle.css', array(), undefined );
    wp_register_style('build.ddca7998b98c837c58eb', $wwe_template_directory_uri . '/_dist/css/build.ddca7998b98c837c58eb.css', array(), undefined );
    wp_register_style('gutenberg', $wwe_template_directory_uri . '/theme_plugins/gutenberg/dist/css/gutenberg.css', array(), undefined );
    wp_enqueue_style('gutenberg.js.bundle');
    wp_enqueue_style('build.ddca7998b98c837c58eb');
    wp_enqueue_style('gutenberg');
    do_action('wwe_wp_enqueue_scripts_after');
});
add_action( 'enqueue_block_editor_assets', function() use($wwe_template_directory_uri){
    do_action('wwe_enqueue_block_editor_assets_before');
    wp_register_script('gutenberg', $wwe_template_directory_uri . '/theme_plugins/gutenberg/dist/js/gutenberg.ddca7998b98c837c58eb.js', array('jquery'), undefined, true );
    wp_enqueue_script('gutenberg');
    wp_register_style('gutenberg', $wwe_template_directory_uri . '/theme_plugins/gutenberg/dist/css/gutenberg.css', array(), undefined );
    wp_enqueue_style('gutenberg');
    do_action('wwe_enqueue_block_editor_assets_after');
});
$wwe_style_0 = <<<TEXT
body{font-family:Roboto,sans-serif;color:#0c0f17;}
TEXT;
add_action('wp_enqueue_scripts', function() use($wwe_style_0) {
    if(is_front_page() || is_archive()){
        wp_register_style('wwe_critical_styles-0', false, false, false, true);
        wp_add_inline_style('wwe_critical_styles-0', $wwe_style_0);
        wp_enqueue_style('wwe_critical_styles-0');
    }
}, 1);
```



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