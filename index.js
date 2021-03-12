const webpackPkg = require('webpack/package.json');

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let isWebpack4 = parseFloat(webpackPkg.version) < 5;

let jsonHash = '';

function webpackWpEntrypoints(options){

	options = {
		type: 'wp', //json
		filename: 'wwe_entrypoints.php',
		path: './',
		entryOptions: {},
		chunkOptions: undefined, //deprecated
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
		criticalStyles: [
			{
				test: false, //regexp or function, false - skip. The function receives 3 arguments: fileName, content.
				theme: true, //Does not inherit the values of the main options.
				admin: false, //Does not inherit the values of the main options.
				gutenberg: false, //Does not inherit the values of the main options.
				footer: false, //Does not inherit the values of the main options. Works with theme only.
				conditions: `true`, //wordpress functions are inserted into the "if ({{conditions}})" check condition
				variableTemplate: `{{styles}}`, //Template for generating output of styles: {{styles}} - inserts a variable with styles.
			},
		],
		customFiles: {
			js: [{
				src: false, //If set to false, it will not be generated.
				handle: false, //If not set, a hash from src will be generated.
				dependence: undefined, //Inherits the value of the main option.
				gutenberg: null, //Inherits the value of the main option.
				admin: null, //Inherits the value of the main option.
				theme: null, //Inherits the value of the main option.
				async: null, //Inherits the value of the main option.
				footer: null, //Inherits the value of the main option.
			}],
			css: [],
		},
		...options,
	};

	if(options.chunkOptions){
		options.entryOptions = options.chunkOptions;
		console.warn('Warning: options.chunkOptions is deprecated; use options.entryOptions instead. options.chunkOptions are deprecated and will be removed in a future version.');
	}

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
	let self = this;

	let criticalStyles = {};
	compiler.hooks.emit.tapAsync('webpackWpEntrypoints', (compilation, callback) => {
		if(typeof self.options.criticalStyles === 'undefined' || !self.options.criticalStyles || !self.options.criticalStyles.length)
			return callback();
		for(let file in compilation.assets){
			let fileObj = compilation.assets[file];
			let source = fileObj.source();
			self.options.criticalStyles.forEach((obj, index) => {
				let settings = {
					test: false,
					theme: false,
					admin: false,
					gutenberg: false,
					footer: false,
					conditions: `true`,
					variableTemplate: `{{styles}}`,
					...obj,
				};

				if(!settings.test)
					return;

				let testResult = false;
				if(typeof settings.test == 'function'){
					testResult = settings.test(file, source);
				}else{
					testResult = settings.test.test(file);
				}
				if(!testResult)
					return;

				let stylesVar = '$wwe_style_' + index;

				if(typeof criticalStyles[index] == 'undefined')
					criticalStyles[index] = {};
				if(!criticalStyles[index].settings)
					criticalStyles[index].settings = settings;
				if(!criticalStyles[index].variable)
					criticalStyles[index].variable = stylesVar;
				if(!criticalStyles[index].files)
					criticalStyles[index].files = {};
				criticalStyles[index].files[file] = {source: source};
			});
		}

		callback();
	});
	compiler.hooks.done.tapAsync('webpackWpEntrypoints', (compilation, callback) => { //https://webpack.js.org/api/compiler-hooks/#done
		let compilationToJson = compilation.toJson();
		let pathToSave = this.options.path;
		let nameToSave = this.options.filename;
		const output = path.relative(pathToSave, compilationToJson.outputPath);
		const destination = path.join(pathToSave, nameToSave);

		let scripts = [];
		let styles = [];

		let customFilesEach = (type) => (obj) => {
			if(!obj.src)
				return;

			let name = obj.handle;
			if(!name){
				let md5sum = crypto.createHash('md5');
				md5sum.update(obj.src);
				name = md5sum.digest('hex');
			}

			let dependence = typeof obj.dependence != 'undefined' && (Array.isArray(obj.dependence)? obj.dependence : []) || undefined;

			let script = {
				name: name,
				file: obj.src,
				dependent: [], //The scripts on which the main depends
				customDependent: typeof dependence != 'undefined'? dependence : (type == 'js'? this.options.dependence : this.options.dependenceCss),
				async: isBool(obj.async)? obj.async : this.options.async,
				defer: isBool(obj.defer)? obj.defer : this.options.defer,
				footer: isBool(obj.footer)? obj.footer : this.options.footer,
				admin: isBool(obj.admin)? obj.admin : this.options.admin,
				gutenberg: isBool(obj.gutenberg)? obj.gutenberg : this.options.gutenberg,
				theme: isBool(obj.theme)? obj.theme : this.options.theme,
			};
			if(script.async == true && script.defer == true)
				script.defer = false;

			if(type == 'js'){
				scripts.push(script);
			}else{
				styles.push(script);
			}
		};

		let collectedStyles = {};
		Object.entries(compilationToJson.entrypoints).forEach((values, pointsIndex) => {
			let key = values[0];
			let value = JSON.parse(JSON.stringify(values[1]));
			let valueAssets = !isWebpack4? value.assets.map(({name}) => name) : value.assets;
			let mainFileIndex = value.assets.length - 1;
			let entryOptions = typeof this.options.entryOptions[key] != 'undefined'? this.options.entryOptions[key] : {};
			let customDependence = entryOptions && typeof entryOptions.dependence != 'undefined' && (Array.isArray(entryOptions.dependence)? entryOptions.dependence : []) || undefined;
			let customDependenceCss = entryOptions && typeof entryOptions.dependenceCss != 'undefined' && (Array.isArray(entryOptions.dependenceCss)? entryOptions.dependenceCss : []) || undefined;
			let excludeScripts = entryOptions && entryOptions.excludeScripts || this.options.excludeScripts;
			let excludeStyles = entryOptions && entryOptions.excludeStyles || this.options.excludeStyles;
			let registerHandleScript = entryOptions && entryOptions.registerHandleScript || '';
			let registerHandleStyle = entryOptions && entryOptions.registerHandleStyle || '';

			if(entryOptions === false || excludeScripts && excludeStyles)
				return;

			let script = {};

			if(!excludeScripts){
				script = {
					name: registerHandleScript || key,
					original_file: valueAssets[mainFileIndex],
					file: path.join(output, valueAssets[mainFileIndex]).replace(/\\/g, '/'),
					dependent: [], //The scripts on which the main depends
					customDependent: typeof customDependence != 'undefined'? customDependence : this.options.dependence,
					async: isBool(entryOptions.async)? entryOptions.async : this.options.async,
					defer: isBool(entryOptions.defer)? entryOptions.defer : this.options.defer,
					footer: isBool(entryOptions.footer)? entryOptions.footer : this.options.footer,
					admin: isBool(entryOptions.admin)? entryOptions.admin : this.options.admin,
					gutenberg: isBool(entryOptions.gutenberg)? entryOptions.gutenberg : this.options.gutenberg,
					theme: isBool(entryOptions.theme)? entryOptions.theme : this.options.theme,
				};
				if(script.async == true && script.defer == true)
					script.defer = false;

				scripts.push(script);
			}

			let script_i = 0;
			let style_i = 0;
			valueAssets.forEach((file, i) => {
				if(i == mainFileIndex)
					return;

				let src = path.join(output, file).replace(/\\/g, '/');

				if(/\.js$/i.test(src)){
					if(!excludeScripts){
						script.dependent.push({
							file: src,
							original_file: file,
							name: (registerHandleScript? registerHandleScript + '~' + pointsIndex + '~' + script_i++ : false) || path.basename(src, '.js'),
							customDependent: this.options.dependence && this.options.dependence.length && this.options.dependence || [],
							defer: script.defer,
							footer: script.footer,
						});
					}
				}else if(/\.css$/i.test(src)){
					if(!excludeStyles){
						for(let index in self.options.criticalStyles){ //skip critical styles
							if(criticalStyles[index] && criticalStyles[index].files[file])
								return;
						}

						if(typeof collectedStyles[key] == 'undefined')
							collectedStyles[key] = [];

						let name = (registerHandleStyle? registerHandleStyle + (collectedStyles[key].length? '~' + style_i++ : '') : false) || path.basename(src, '.css');

						collectedStyles[key].push({
							file: src,
							original_file: file,
							name,
						});

						styles.push({
							file: src,
							original_file: file,
							name,
							customDependent: typeof customDependence != 'undefined'? customDependence : this.options.dependenceCss,
							admin: entryOptions.adminCss === false || entryOptions.adminCss === true? entryOptions.adminCss : (entryOptions.admin !== null && entryOptions.admin !== undefined? entryOptions.admin : this.options.adminCss),
							gutenberg: entryOptions.gutenbergCss === false || entryOptions.gutenbergCss === true? entryOptions.gutenbergCss : (entryOptions.gutenberg !== null && entryOptions.gutenberg !== undefined? entryOptions.gutenberg : this.options.gutenbergCss),
							theme: entryOptions.themeCss === false || entryOptions.themeCss === true? entryOptions.themeCss : (entryOptions.theme !== null && entryOptions.theme !== undefined? entryOptions.theme : this.options.themeCss),
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
			self.options.customFiles && self.options.customFiles.js && self.options.customFiles.js.length && self.options.customFiles.js.forEach(customFilesEach('js'));
			scripts.forEach((script) => {
				if(!isEnable(script))
					return;
				script.dependent.forEach((depScript) => {
					if(!isEnable(script))
						return;
					let depString = (() => depScript.customDependent && depScript.customDependent.length && "'" + depScript.customDependent.join("','") + "'" || '')();
					text += "\twp_register_script('" + depScript.name + "', $wwe_template_directory_uri . '/" + depScript.file + "', array(" + depString + "), null, " + depScript.footer + ");\n";
				});
				let depString = (() => {
					let arr = [];
					script.dependent.forEach((v) => script.name != v.name && arr.push(v.name));
					arr = arr.concat(script.customDependent);
					if(arr.length)
						return "'" + arr.join("','") + "'";
					return '';
				})();
				let file;
				if(/^(https?:)?\/\//.test(script.file)){
					file = "'" + script.file + "'";
				}else{
					file = "$wwe_template_directory_uri . '/" + script.file + "'";
				}
				text += "\twp_register_script('" + script.name + "', " + file + ", array(" + depString + "), null, " + script.footer + ");\n";
			});
			scripts.forEach((script) => {
				if(!isEnable(script))
					return;
				text += "\twp_enqueue_script('" + script.name + "');\n";
			});
			/*> scripts */
			/* styles */
			self.options.customFiles && self.options.customFiles.css && self.options.customFiles.css.length && self.options.customFiles.css.forEach(customFilesEach('css'));
			// if(isWebpack4)
			// 	styles.reverse();
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
				let file;
				if(/^(https?:)?\/\//.test(style.file)){
					file = "'" + style.file + "'";
				}else{
					file = "$wwe_template_directory_uri . '/" + style.file + "'";
				}
				text += "\twp_register_style('" + style.name + "', " + file + ", array(" + depString + "), null);\n";
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
				asyncDefrSrc += '\t\treturn str_replace(" src", " ' + (script.async? 'async' : '') + '' + (script.defer? 'defer' : '') + ' src", $tag);\n';
				asyncDefrSrc += '\t}\n';
				script.dependent.forEach((depScript) => {
					if(!depScript.async && !depScript.defer)
						return;
					asyncDefrSrc += '\tif($handle == "' + depScript.name + '"){\n';
					asyncDefrSrc += '\t\treturn str_replace(" src", " ' + (depScript.async? 'async' : '') + '' + (depScript.defer? 'defer' : '') + ' src", $tag);\n';
					asyncDefrSrc += '\t}\n';
				});
			});
			if(asyncDefrSrc){
				blob += 'add_filter("script_loader_tag", function($tag, $handle){\n';
				blob += asyncDefrSrc;
				blob += '\treturn $tag;\n';
				blob += '}, 10, 2);\n';
			}

			let blobTheme = enqueue_scripts('theme');
			if(blobTheme){
				blob += "add_action('wp_enqueue_scripts', function() use($wwe_template_directory_uri){\n";
				blob += "\tdo_action('wwe_wp_enqueue_scripts_before');\n";
				blob += blobTheme;
				blob += "\tdo_action('wwe_wp_enqueue_scripts_after');\n";
				blob += "});\n";
			}

			let blobAdmin = enqueue_scripts('admin');
			if(blobAdmin){
				blob += "add_action('admin_enqueue_scripts', function() use($wwe_template_directory_uri){\n";
				blob += "\tdo_action('wwe_admin_enqueue_scripts_before');\n";
				blob += blobAdmin;
				blob += "\tdo_action('wwe_admin_enqueue_scripts_after');\n";
				blob += "});\n";
			}

			let blobGutenberg = enqueue_scripts('gutenberg');
			if(blobGutenberg){
				blob += "add_action('enqueue_block_editor_assets', function() use($wwe_template_directory_uri){\n";
				blob += "\tdo_action('wwe_enqueue_block_editor_assets_before');\n";
				blob += blobGutenberg;
				blob += "\tdo_action('wwe_enqueue_block_editor_assets_after');\n";
				blob += "});\n";
			}

			if(Object.keys(criticalStyles).length){
				Object.keys(criticalStyles).forEach((key) => {
					let options = criticalStyles[key];
					let source = '';
					for(let file in criticalStyles[key].files){
						source += criticalStyles[key].files[file].source + ' ';
					}
					if(!source)
						return;

					$stylesPhp = '';
					$stylesPhp += "\tif(" + options.settings.conditions + "){\n";
					$stylesPhp += "\t\twp_register_style('wwe_critical_styles-" + key + "', false, false, false, true);\n";
					$stylesPhp += "\t\twp_add_inline_style('wwe_critical_styles-" + key + "', " + applyTemplate(options.settings.variableTemplate, {styles: options.variable}) + ");\n";
					$stylesPhp += "\t\twp_enqueue_style('wwe_critical_styles-" + key + "');\n";
					$stylesPhp += "\t}";

					blob += "" +
						options.variable + " = <<<TEXT\n" +
						source + "\n" +
						"TEXT;\n";
					if(options.settings.theme){
						if(options.settings.footer){
							blob += "add_action('wp_footer', function() use(" + options.variable + ") {\n";
						}else{
							blob += "add_action('wp_enqueue_scripts', function() use(" + options.variable + ") {\n";
						}
						blob += $stylesPhp;
						blob += "\n}, 1);\n";
					}
					if(options.settings.admin){
						blob += "add_action('admin_enqueue_scripts', function() use(" + options.variable + ") {\n";
						blob += $stylesPhp;
						blob += "\n}, 1);\n";
					}
					if(options.settings.gutenberg){
						blob += "add_action('enqueue_block_editor_assets', function() use(" + options.variable + ") {\n";
						blob += $stylesPhp;
						blob += "\n}, 1);\n";
					}
				});
			}

			criticalStyles = {};
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

function isBool(v){
	return v === false || v === true;
}

function applyTemplate(template, properties){
	var returnValue = "";

	var templateFragments = template.split("{{");

	returnValue += templateFragments[0];

	for(var i = 1; i < templateFragments.length; i++){
		var fragmentSections = templateFragments[i].split("}}", 2);
		returnValue += properties[fragmentSections[0]];
		returnValue += fragmentSections[1];
	}

	return returnValue;
}