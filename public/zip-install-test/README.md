# Test a downloaded Pokecharm ZIP

This independent page exercises the actual package output through a normal script tag. It does not import the app or call its widget mount API.

1. Run `pnpm build`.
2. Start the built site with `pnpm preview` and open its installer.
3. Select a companion, set a name and size, then download the ZIP.
4. Extract the ZIP into `dist/zip-install-test/`. The resulting path must be `dist/zip-install-test/pokecharm-install/widget.js`.
5. Open `/zip-install-test/` on the preview server.

The page reads the extracted `config.json`, checks every listed asset under the package folder, then adds a standard script tag whose `src` and `data-assets-base` point to the extracted package. Scroll the sample page and test click-to-move and Pokéball throwing.

The preview server must be serving the built `dist` directory so its `/widget.js` production runtime is available when downloading the package.
