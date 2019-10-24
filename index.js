const fs = require('fs');
const path = require('path');
// const util = require('util');
// console.log(util.inspect(compilation, {depth: 4}));

function webpackWpEntrypoints(options){

	options = {
		type: 'wp', //json
		filename: 'wwe_entrypoints.php',
		path: '',
		chunkOptions: {},
		dependence: [],
		dependenceCss: [],
		async: false,
		defer: true,
		footer: true,
		admin: false,
		adminCss: null,
		theme: true,
		themeCss: null,
		...options
	};

	if(options.async == true && options.defer == true)
		options.defer = false;
	if(options.themeCss === null)
		options.themeCss = options.theme;
	if(options.adminCss === null)
		options.adminCss = options.admin;

	if(!options.filename){
		throw new Error("filename property is required on options");
	}else if(!options.path){
		throw new Error("path property is required on options");
	}

	this.options = options;
}

webpackWpEntrypoints.prototype.apply = function(compiler){
	compiler.hooks.done.tapAsync('webpackWpEntrypoints', (compilation, callback) => {
		var compilationToJson = compilation.toJson();
		var pathToSave = this.options.path;
		var nameToSave = this.options.filename;
		const output = path.relative(pathToSave, compilationToJson.outputPath);
		const destination = path.join(pathToSave, nameToSave);

		var scripts = [];
		var styles = [];

		Object.entries(compilationToJson.entrypoints).forEach((values) => {
			let key = values[0];
			let value = values[1];
			let mainFileIndex = value.assets.length - 1;
			let chunkOptions = typeof this.options.chunkOptions[key] != 'undefined'? this.options.chunkOptions[key] : false;
			let customDependence = chunkOptions && chunkOptions.dependence && chunkOptions.dependence.length && chunkOptions.dependence || [];
			let customDependenceCss = chunkOptions && chunkOptions.dependenceCss && chunkOptions.dependenceCss.length && chunkOptions.dependenceCss || [];

			let script = {
				name: key,
				file: path.join(output, value.assets[mainFileIndex]).replace(/\\/g, '/'),
				dependent: [],
				customDependent: [].concat(this.options.dependence, customDependence),
				async: chunkOptions.async === false || chunkOptions.async === true? chunkOptions.async : this.options.async,
				defer: chunkOptions.defer === false || chunkOptions.defer === true? chunkOptions.defer : this.options.defer,
				footer: chunkOptions.footer === false || chunkOptions.footer === true? chunkOptions.footer : this.options.footer,
				admin: chunkOptions.admin === false || chunkOptions.admin === true? chunkOptions.admin : this.options.admin,
				theme: chunkOptions.theme === false || chunkOptions.theme === true? chunkOptions.theme : this.options.theme,
			};
			if(script.async == true && script.defer == true)
				script.defer = false;

			scripts.push(script);

			value.assets.forEach((file, i) => {
				if(i == mainFileIndex)
					return;

				file = path.join(output, file).replace(/\\/g, '/');

				if(/\.js$/i.test(file)){
					script.dependent.push({
						file: file,
						name: path.basename(file, '.js'),
						customDependent: this.options.dependence && this.options.dependence.length && this.options.dependence || [],
						defer: script.defer,
						footer: script.footer,
					});
				}else if(/\.css$/i.test(file)){
					styles.push({
						file: file,
						name: path.basename(file, '.css'),
						customDependent: [].concat(this.options.dependenceCss, customDependenceCss),
						admin: chunkOptions.adminCss === false || chunkOptions.adminCss === true? chunkOptions.adminCss : this.options.adminCss,
						theme: chunkOptions.themeCss === false || chunkOptions.themeCss === true? chunkOptions.themeCss : this.options.themeCss,
					});
				}

			});
		});

		function generateRegister(admin = false){
			var text = '';
			scripts.forEach((script) => {
				script.dependent.forEach((depScript) => {
					let depString = (() => depScript.customDependent && depScript.customDependent.length && "'" + depScript.customDependent.join("','") + "'" || '')();
					text += "wp_register_script('"+depScript.name+"', $wwe_template_directory_uri . '/"+depScript.file+"', array(" + depString + "), null, " + depScript.footer + " );\n";
				});
				let depString = (() => {
					let arr = [];
					script.dependent.forEach((v) => script.name != v.name && arr.push(v.name));
					arr = arr.concat(script.customDependent);
					return "'" + arr.join("','") + "'";
				})();
				text += "wp_register_script('"+script.name+"', $wwe_template_directory_uri . '/"+script.file+"', array("+depString+"), null, " + script.footer + " );\n";
			});
			styles.forEach((style) => {
				let depString = (() => style.customDependent && style.customDependent.length && "'" + style.customDependent.join("','") + "'" || '')();
				text += "wp_register_style('"+style.name+"', $wwe_template_directory_uri . '/"+style.file+"', array(" + depString + "), null );\n";
			});
			return text;
		}

		function enqueue_scripts(admin = false){
			var text = '';
			scripts.forEach((script) => {
				if(!admin && script.theme || admin && script.admin)
					text += "\twp_enqueue_script('" + script.name + "');\n";
			});
			styles.forEach((style) => {
				if(!admin && style.theme || admin && style.admin)
					text += "\twp_enqueue_style('" + style.name + "');\n";
			});
			return text;
		}

		var blob = '';

		if(this.options.type == 'json'){
			blob = JSON.stringify({
				scripts: scripts,
				styles: styles,
			}, null, 2);
		}else{
			blob += "<?php\n";
			blob += '$wwe_template_directory_uri = !empty($wwe_template_directory_uri)? $wwe_template_directory_uri : get_template_directory_uri();\n';
			blob += generateRegister();

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

			blob += "add_action( 'wp_enqueue_scripts', function(){\n";
			blob += enqueue_scripts();
			blob += "});\n";

			let blobAdmin = enqueue_scripts(true);
			if(blobAdmin){
				blob += "add_action( 'admin_enqueue_scripts', function(){\n";
				blob += blobAdmin;
				blob += "});\n";
			}
		}

		fs.writeFile(destination, blob, {encoding: 'utf8', flag: 'w'}, function (err) {
			if(err){
				console.error(`Failed to open file '${destination}' with error '${err.toString()}'; quitting.`);
			}

			callback();
		});

	});
};

module.exports = webpackWpEntrypoints;
