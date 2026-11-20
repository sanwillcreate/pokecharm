# Pokecharm self-hosted companion

This package is configured for **moss** at a rendered height of **96px**. The widget and its companion/Pokéball assets are included locally.

## Install

1. Extract pokecharm-install.zip.
2. Upload the extracted pokecharm-install folder to a publicly accessible location on your website. Keep its files and folders together.
3. Add this script to your website HTML, replacing the path with the public URL of the uploaded folder:

```html
<script src="https://your-site.example/pokecharm-install/widget.js" data-assets-base="https://your-site.example/pokecharm-install/" data-companion="moss" data-name="Moss" data-size="120,120" async></script>
```

Replace both example URLs with the public location where you uploaded the folder. The data-assets-base value must point to the folder containing the assets directory, including its final slash.

## Change the companion settings

Edit data-name to change the displayed name. Edit data-size to change the desktop and mobile widget box sizes in pixels, in desktop,mobile order (each value must be 24–512). The generated values preserve the selected 96px rendered size; see config.json for the matching widgetBox value.

This ZIP contains assets only for moss. Keep the generated data-companion value as-is. To use another companion, download a new ZIP with that companion selected in Pokecharm.

To remove the companion, remove this script tag from your website HTML and publish the change.
