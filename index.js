const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// const util = require('util');
// console.log(util.inspect(compilation, {depth: 4}));

let jsonHash = '';

function webpackWpEntrypoints(options){

	options = {
		type: 'wp', //json
		filename: 'wwe_entrypoints.php',
		path: './',
		chunkOptions: {},
		dependence: [],
		dependenceCss: [],
		async: false,
		defer: true,
		footer: true,
		admin: false,
		adminCss: null,
		gutenberg: false,
		gutenbergCss: null,
		theme: true,
		themeCss: null,
		excludeScripts: false,
		excludeStyles: false,
		...options,
	};

	if(options.async == true && options.defer == true)
		options.defer = false;
	if(options.themeCss === null)
		options.themeCss = options.theme;
	if(options.adminCss === null)
		options.adminCss = options.admin;
	if(options.gutenbergCss === null)
		options.gutenbergCss = options.gutenberg;

	if(!options.filename){
		throw new Error("filename property is required on options");
	}else if(!options.path){
		throw new Error("path property is required on options");
	}

	this.options = options;
}

webpackWpEntrypoints.prototype.apply = function(compiler){
	compiler.hooks.done.tapAsync('webpackWpEntrypoints', (compilation, callback) => {
		let compilationToJson = compilation.toJson();
		let pathToSave = this.options.path;
		let nameToSave = this.options.filename;
		const output = path.relative(pathToSave, compilationToJson.outputPath);
		const destination = path.join(pathToSave, nameToSave);

		let scripts = [];
		let styles = [];

		let collectedStyles = {};
		Object.entries(compilationToJson.entrypoints).forEach((values, pointsIndex) => {
			let key = values[0];
			let value = JSON.parse(JSON.stringify(values[1]));
			let mainFileIndex = value.assets.length - 1;
			let chunkOptions = typeof this.options.chunkOptions[key] != 'undefined'? this.options.chunkOptions[key] : {};
			let customDependence = chunkOptions && chunkOptions.dependence && chunkOptions.dependence.length && chunkOptions.dependence || [];
			let customDependenceCss = chunkOptions && chunkOptions.dependenceCss && chunkOptions.dependenceCss.length && chunkOptions.dependenceCss || [];
			let excludeScripts = chunkOptions && chunkOptions.excludeScripts || this.options.excludeScripts;
			let excludeStyles = chunkOptions && chunkOptions.excludeStyles || this.options.excludeStyles;
			let registerHandleScript = chunkOptions && chunkOptions.registerHandleScript || '';
			let registerHandleStyle = chunkOptions && chunkOptions.registerHandleStyle || '';

			if(chunkOptions === false || excludeScripts && excludeStyles)
				return;

			let script = {};

			if(!excludeScripts){
				script = {
					name: (registerHandleScript? registerHandleScript : false) || key,
					file: path.join(output, value.assets[mainFileIndex]).replace(/\\/g, '/'),
					dependent: [],
					customDependent: [].concat(this.options.dependence, customDependence),
					async: chunkOptions.async === false || chunkOptions.async === true? chunkOptions.async : this.options.async,
					defer: chunkOptions.defer === false || chunkOptions.defer === true? chunkOptions.defer : this.options.defer,
					footer: chunkOptions.footer === false || chunkOptions.footer === true? chunkOptions.footer : this.options.footer,
					admin: chunkOptions.admin === false || chunkOptions.admin === true? chunkOptions.admin : this.options.admin,
					gutenberg: chunkOptions.gutenberg === false || chunkOptions.gutenberg === true? chunkOptions.gutenberg : this.options.gutenberg,
					theme: chunkOptions.theme === false || chunkOptions.theme === true? chunkOptions.theme : this.options.theme,
				};
				if(script.async == true && script.defer == true)
					script.defer = false;

				scripts.push(script);
			}

			value.assets.forEach((file, i) => {
				if(i == mainFileIndex)
					return;

				file = path.join(output, file).replace(/\\/g, '/');

				if(/\.js$/i.test(file)){
					if(!excludeScripts){
						script.dependent.push({
							file,
							name: (registerHandleScript? registerHandleScript + '~' + pointsIndex + '~' + i : false) || path.basename(file, '.js'),
							customDependent: this.options.dependence && this.options.dependence.length && this.options.dependence || [],
							defer: script.defer,
							footer: script.footer,
						});
					}
				}else if(/\.css$/i.test(file)){
					if(!excludeStyles){
						if(typeof collectedStyles[key] == 'undefined')
							collectedStyles[key] = [];

						let name = (registerHandleStyle? registerHandleStyle + (collectedStyles[key].length? '~' + i : '') : false) || path.basename(file, '.css');

						collectedStyles[key].push({
							file,
							name,
						});

						styles.push({
							file,
							name,
							customDependent: [].concat(this.options.dependenceCss, customDependenceCss),
							admin: chunkOptions.adminCss === false || chunkOptions.adminCss === true? chunkOptions.adminCss : (chunkOptions.admin !== null? chunkOptions.admin : this.options.adminCss),
							gutenberg: chunkOptions.gutenbergCss === false || chunkOptions.gutenbergCss === true? chunkOptions.gutenbergCss : (chunkOptions.gutenberg !== null? chunkOptions.gutenberg : this.options.gutenbergCss),
							theme: chunkOptions.themeCss === false || chunkOptions.themeCss === true? chunkOptions.themeCss : (chunkOptions.theme !== null? chunkOptions.theme : this.options.themeCss),
						});
					}
				}

			});
		});

		function generateRegister(type = 'theme'){
			let text = '';

			return text;
		}

		function enqueue_scripts(type = 'theme'){ //theme, admin, gutenberg
			let text = '';
			let isEnable = (obj) => {
				switch(type){
					case 'theme':
						return obj.theme;
					case 'admin':
						return obj.admin;
					case 'gutenberg':
						return obj.gutenberg;
				}
			};
			/* scripts */
			scripts.forEach((script) => {
				if(!isEnable(script))
					return;
				script.dependent.forEach((depScript) => {
					if(!isEnable(script))
						return;
					let depString = (() => depScript.customDependent && depScript.customDependent.length && "'" + depScript.customDependent.join("','") + "'" || '')();
					text += "\twp_register_script('" + depScript.name + "', $wwe_template_directory_uri . '/" + depScript.file + "', array(" + depString + "), null, " + depScript.footer + " );\n";
				});
				let depString = (() => {
					let arr = [];
					script.dependent.forEach((v) => script.name != v.name && arr.push(v.name));
					arr = arr.concat(script.customDependent);
					return "'" + arr.join("','") + "'";
				})();
				text += "\twp_register_script('" + script.name + "', $wwe_template_directory_uri . '/" + script.file + "', array(" + depString + "), null, " + script.footer + " );\n";
			});
			scripts.forEach((script) => {
				if(!isEnable(script))
					return;
				text += "\twp_enqueue_script('" + script.name + "');\n";
			});
			/*> scripts */
			/* styles */
			styles.forEach((style) => {
				if(!isEnable(style))
					return;
				if(style.customDependent && style.customDependent.length){
					style.customDependent.forEach((depName, i) => {
						if(typeof collectedStyles[depName] != 'undefined'){
							delete style.customDependent[i];
							collectedStyles[depName].forEach((styleName) => {
								style.customDependent.push(styleName.name);
							});
						}
					});

					style.customDependent = style.customDependent.filter((v) => v);
				}
				let depString = (() => style.customDependent && style.customDependent.length && "'" + style.customDependent.join("','") + "'" || '')();
				text += "\twp_register_style('" + style.name + "', $wwe_template_directory_uri . '/" + style.file + "', array(" + depString + "), null );\n";
			});
			styles.forEach((style) => {
				if(!isEnable(style))
					return;
				text += "\twp_enqueue_style('" + style.name + "');\n";
			});
			/*> styles */
			return text;
		}

		/* check change < */
		let jsonString = JSON.stringify({
			scripts: scripts,
			styles: styles,
		}, null, 2);
		let md5sum = crypto.createHash('md5');
		md5sum.update(jsonString);
		let hash = md5sum.digest('hex');
		if(jsonHash == hash){
			callback();
			return false;
		}
		jsonHash = hash;
		/* > check change */

		let blob = '';

		if(this.options.type == 'json'){
			blob = jsonString;
		}else{
			blob += "<?php\n";
			blob += '$wwe_template_directory_uri = !empty($wwe_template_directory_uri)? $wwe_template_directory_uri : get_template_directory_uri();\n';

			let asyncDefrSrc = '';
			scripts.forEach((script) => {
				if(!script.async && !script.defer)
					return;
				asyncDefrSrc += '\tif($handle == "' + script.name + '"){\n';
				asyncDefrSrc += '\t\treturn str_replace( " src", " ' + (script.async? 'async' : '') + '' + (script.defer? 'defer' : '') + ' src", $tag );\n';
				asyncDefrSrc += '\t}\n';
				script.dependent.forEach((depScript) => {
					if(!depScript.async && !depScript.defer)
						return;
					asyncDefrSrc += '\tif($handle == "' + depScript.name + '"){\n';
					asyncDefrSrc += '\t\treturn str_replace( " src", " ' + (depScript.async? 'async' : '') + '' + (depScript.defer? 'defer' : '') + ' src", $tag );\n';
					asyncDefrSrc += '\t}\n';
				});
			});
			if(asyncDefrSrc){
				blob += 'add_filter( "script_loader_tag", function( $tag, $handle ){\n';
				blob += asyncDefrSrc;
				blob += '\treturn $tag;\n';
				blob += '}, 10, 2 );\n';
			}

			let blobTheme = enqueue_scripts('theme');
			if(blobTheme){
				blob += "add_action( 'wp_enqueue_scripts', function() use($wwe_template_directory_uri){\n";
				blob += "\tdo_action('wwe_wp_enqueue_scripts_before');\n";
				blob += blobTheme;
				blob += "\tdo_action('wwe_wp_enqueue_scripts_after');\n";
				blob += "});\n";
			}

			let blobAdmin = enqueue_scripts('admin');
			if(blobAdmin){
				blob += "add_action( 'admin_enqueue_scripts', function() use($wwe_template_directory_uri){\n";
				blob += "\tdo_action('wwe_admin_enqueue_scripts_before');\n";
				blob += blobAdmin;
				blob += "\tdo_action('wwe_admin_enqueue_scripts_after');\n";
				blob += "});\n";
			}

			let blobGutenberg = enqueue_scripts('gutenberg');
			if(blobGutenberg){
				blob += "add_action( 'enqueue_block_editor_assets', function() use($wwe_template_directory_uri){\n";
				blob += "\tdo_action('wwe_enqueue_block_editor_assets_before');\n";
				blob += blobGutenberg;
				blob += "\tdo_action('wwe_enqueue_block_editor_assets_after');\n";
				blob += "});\n";
			}
		}

		fs.writeFile(destination, blob, {encoding: 'utf8', flag: 'w'}, function(err){
			if(err){
				console.error(`Failed to open file '${destination}' with error '${err.toString()}'; quitting.`);
			}

			callback();
		});

	});
};

module.exports = webpackWpEntrypoints;