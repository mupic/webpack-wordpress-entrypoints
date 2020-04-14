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
							dependence: ['second'], //Sets the dependency of this script on another
							dependenceCss: [], //Sets the dependency of this style on another
							async: true, //Set the async attribute for this file only.
							defer: false, //defer and async cannot be installed together, only async will be used
							footer: true, //Put the script at the bottom of the wordpress site
							admin: true, //Include the script to the wordpress admin panel
							adminCss: null, //Include the style to the wordpress admin panel. Default: same as admin
							theme: true, //Include the script to the site theme
							themeCss: null, //Include the style to the site theme. Default: same as theme
							excludeScripts: false, //true - Excludes script output. Inherits the meaning of the parent.
							excludeStyles: false, //true - Excludes style output. Inherits the meaning of the parent.
						},
					},
					dependence: ['jquery'], //Sets the dependence of all scripts on the specified. Default: [].
					dependenceCss: [], //Sets the dependence of all styles on the specified. Default: [].
					async: false, //Set the async attribute for all files. Default: false.
					defer: true, //defer and async cannot be installed together, only async will be used. Default: true.
					footer: true, //Put scripts at the bottom of the wordpress site. Default: true.
					admin: false, //Include scripts to the wordpress admin panel. Default: false.
					adminCss: null, //Include styles to the wordpress admin panel. Default: same as admin
					theme: true, //Include scripts to the site theme. Default: true.
					themeCss: null, //Include styles to the site theme. Default: same as theme
					excludeScripts: false, //true - Excludes script output
					excludeStyles: false, //true - Excludes style output
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
	wp_register_script('first', $wwe_template_directory_uri . '/dist/js/first.js', array('jquery','second'), null, true );
	wp_register_script('vendors~last~second', $wwe_template_directory_uri . '/dist/js/vendors~last~second.js', array('jquery'), null, true );
	wp_register_script('vendors~second', $wwe_template_directory_uri . '/dist/js/vendors~second.js', array('jquery'), null, true );
	wp_register_script('second', $wwe_template_directory_uri . '/dist/js/second.js', array('vendors~last~second','vendors~second','jquery'), null, true );
	wp_register_script('vendors~last~second', $wwe_template_directory_uri . '/dist/js/vendors~last~second.js', array('jquery'), null, true );
	wp_register_script('vendors~last', $wwe_template_directory_uri . '/dist/js/vendors~last.js', array('jquery'), null, true );
	wp_register_script('last', $wwe_template_directory_uri . '/dist/js/last.js', array('vendors~last~second','vendors~last','jquery'), null, true );
	wp_register_style('last', $wwe_template_directory_uri . '/dist/css/last.css', array(), null );
	add_filter( "script_loader_tag", function( $tag, $handle ){
		if($handle == "first"){
			return str_replace( " src", " async src", $tag );
		}
		if($handle == "second"){
			return str_replace( " src", " defer src", $tag );
		}
		if($handle == "vendors~last~second"){
			return str_replace( " src", " defer src", $tag );
		}
		if($handle == "vendors~second"){
			return str_replace( " src", " defer src", $tag );
		}
		if($handle == "last"){
			return str_replace( " src", " defer src", $tag );
		}
		if($handle == "vendors~last~second"){
			return str_replace( " src", " defer src", $tag );
		}
		if($handle == "vendors~last"){
			return str_replace( " src", " defer src", $tag );
		}
		return $tag;
	}, 10, 2 );
	add_action( 'wp_enqueue_scripts', function(){
		wp_enqueue_script('first');
		wp_enqueue_script('second');
		wp_enqueue_script('last');
		wp_enqueue_style('last');
	});
	add_action( 'admin_enqueue_scripts', function(){
		wp_enqueue_script('first');
	});


### type=json
	{
		"scripts": [
			{
				"name": "first",
				"file": "dist/js/first.js",
				"dependent": [],
				"customDependent": [
					"jquery",
					"second"
				],
				"async": true,
				"defer": false,
				"footer": true,
				"admin": true,
				"theme": true
			},
			{
				"name": "second",
				"file": "dist/js/second.js",
				"dependent": [
					{
						"file": "dist/js/vendors~last~second.js",
						"name": "vendors~last~second",
						"customDependent": [
							"jquery"
						],
						"defer": true,
						"footer": true
					},
					{
						"file": "dist/js/vendors~second.js",
						"name": "vendors~second",
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
				"theme": true
			},
			{
				"name": "last",
				"file": "dist/js/last.js",
				"dependent": [
					{
						"file": "dist/js/vendors~last~second.js",
						"name": "vendors~last~second",
						"customDependent": [
							"jquery"
						],
						"defer": true,
						"footer": true
					},
					{
						"file": "dist/js/vendors~last.js",
						"name": "vendors~last",
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
				"theme": true
			}
		],
		"styles": [
			{
				"file": "dist/css/last.css",
				"name": "last",
				"customDependent": [],
				"admin": false,
				"theme": true
			}
		]
	}
