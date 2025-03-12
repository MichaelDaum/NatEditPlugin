import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/editor.js',
  plugins: [
    resolve()
  ],
  output: [
    {
      file: "dist/pkg.js",
      name: "CodeMirror",
      format: "umd",
    }, {
      file: "dist/pkg.min.js",
      name: "CodeMirror",
      format: "umd",
      plugins: [
        terser()
      ]
    }
  ]
};
