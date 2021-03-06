/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const cp = require("child_process");
const path = require("path");
const tc = require("./template-common");
const fs = require("fs");
const async = require("neo-async");

const extraArgs = "";

const targetArgs = global.NO_TARGET_ARGS ? "" : " ./example.js -o dist/output.js ";
const displayReasons = global.NO_REASONS ? "" : " --display-reasons --display-used-exports --display-provided-exports";
const commonArgs = `--display-chunks --no-color --display-max-modules 99999 --display-origins --display-entrypoints --output-public-path "dist/" ${extraArgs} ${targetArgs}`;

let readme = fs.readFileSync(require("path").join(process.cwd(), "template.md"), "utf-8");

const doCompileAndReplace = (args, prefix, callback) => {
	if (!tc.needResults(readme, prefix)) {
		callback();
		return;
	}

	const deleteFiles = (dir) => {
		const targetDir = path.resolve("dist", dir);

		if (path.extname(targetDir) === "") {
			fs.readdirSync(targetDir).forEach((file) => {
				deleteFiles(path.join(targetDir, file));
			});
		} else {
			fs.unlinkSync(targetDir);
		}
	};

	if (fs.existsSync("dist")) {
		for (const dir of fs.readdirSync("dist")) {
			deleteFiles(dir);
		}
	}

	try {
		require.resolve("webpack-cli");
	} catch (e) {
		throw new Error("Please install webpack-cli at root.");
	}

	cp.exec(`node ${path.resolve(__dirname, "../bin/webpack.js")} ${args} ${displayReasons} ${commonArgs}`, (error, stdout, stderr) => {
		if (stderr)
			console.log(stderr);
		if (error !== null)
			console.log(error);
		try {
			readme = tc.replaceResults(readme, process.cwd(), stdout.replace(/[\r?\n]*$/, ""), prefix);
		} catch (e) {
			console.log(stderr);
			throw e;
		}
		callback();
	});
};

async.series([
	callback => doCompileAndReplace("--mode production --env production", "production", callback),
	callback => doCompileAndReplace("--mode development --env development --devtool none", "development", callback),
	callback => doCompileAndReplace("--mode none --env none --output-pathinfo", "", callback)
], () => {
	readme = tc.replaceBase(readme);
	fs.writeFile("README.md", readme, "utf-8", function () { });
});
