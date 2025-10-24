# <img src="https://react-grab.com/logo.svg" width="60" align="center" /> React Grab

[![size](https://img.shields.io/bundlephobia/minzip/react-grab?label=gzip&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/package/react-grab)
[![version](https://img.shields.io/npm/v/react-grab?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-grab)
[![downloads](https://img.shields.io/npm/dt/react-grab.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-grab)

> [**Install using Cursor**](https://cursor.com/link/prompt?text=1.+Search+in+this+codebase+for+the+project%0A2.+Determine+if+the+project+is+using+Next.js+app%2Fpages+router%2C+or+Vite%2C+or+something+else%0A3.+Scrape%3A+https%3A%2F%2Fraw.githubusercontent.com%2Faidenybai%2Freact-grab%2Frefs%2Fheads%2Fmain%2FREADME.md%0A4.+Find+the+installation+instructions+in+the+scraped+content+and+install+it+in+the+user%27s+project%0A)

Grab any element on in your app and give it to Cursor, Claude Code, etc. to change.

By default coding agents cannot access elements on your page. React Grab fixes this - just point and click to provide context!

- Hold <kbd>⌘C</kbd> and click on any element on your page
- Works with Cursor, Claude Code, OpenCode
- Just a single script tag (it’s just JavaScript!)

### [Try out a demo! →](https://react-grab.com)

![React Grab Demo](https://react-grab.com/demo.gif)

## Install

> [**Install using Cursor**](https://cursor.com/link/prompt?text=1.+Search+in+this+codebase+for+the+project%0A2.+Determine+if+the+project+is+using+Next.js+app%2Fpages+router%2C+or+Vite%2C+or+something+else.+Then%2C+modify+their+files+based+on+the+framework%3A%0A%0ANext.js+%28App+router%29%0A%0AAdd+this+inside+of+your+%60app%2Flayout.tsx%60%3A%0A%0A%60%60%60jsx%0Aimport+Script+from+%22next%2Fscript%22%3B%0A%0Aexport+default+function+RootLayout%28%7B+children+%7D%29+%7B%0A++return+%28%0A++++%3Chtml%3E%0A++++++%3Chead%3E%0A++++++++%7B%2F*+put+this+in+the+%3Chead%3E+*%2F%7D%0A++++++++%7Bprocess.env.NODE_ENV+%3D%3D%3D+%22development%22+%26%26+%28%0A++++++++++%3CScript%0A++++++++++++src%3D%22%2F%2Funpkg.com%2Freact-grab%2Fdist%2Findex.global.js%22%0A++++++++++++crossOrigin%3D%22anonymous%22%0A++++++++++++strategy%3D%22beforeInteractive%22%0A++++++++++++data-enabled%3D%22true%22%0A++++++++++%2F%3E%0A++++++++%29%7D%0A++++++++%7B%2F*+rest+of+your+scripts+go+under+*%2F%7D%0A++++++%3C%2Fhead%3E%0A++++++%3Cbody%3E%7Bchildren%7D%3C%2Fbody%3E%0A++++%3C%2Fhtml%3E%0A++%29%3B%0A%7D%0A%60%60%60%0A%0A%23%23%23%23+Next.js+%28Pages+router%29%0A%0AAdd+this+into+your+%60pages%2F_document.tsx%60%3A%0A%0A%60%60%60jsx%0Aimport+%7B+Html%2C+Head%2C+Main%2C+NextScript+%7D+from+%22next%2Fdocument%22%3B%0A%0Aexport+default+function+Document%28%29+%7B%0A++return+%28%0A++++%3CHtml+lang%3D%22en%22%3E%0A++++++%3CHead%3E%0A++++++++%7B%2F*+put+this+in+the+%3CHead%3E+*%2F%7D%0A++++++++%7Bprocess.env.NODE_ENV+%3D%3D%3D+%22development%22+%26%26+%28%0A++++++++++%3CScript%0A++++++++++++src%3D%22%2F%2Funpkg.com%2Freact-grab%2Fdist%2Findex.global.js%22%0A++++++++++++crossOrigin%3D%22anonymous%22%0A++++++++++++strategy%3D%22beforeInteractive%22%0A++++++++++++data-enabled%3D%22true%22%0A++++++++++%2F%3E%0A++++++++%29%7D%0A++++++++%7B%2F*+rest+of+your+scripts+go+under+*%2F%7D%0A++++++%3C%2FHead%3E%0A++++++%3Cbody%3E%0A++++++++%3CMain+%2F%3E%0A++++++++%3CNextScript+%2F%3E%0A++++++%3C%2Fbody%3E%0A++++%3C%2FHtml%3E%0A++%29%3B%0A%7D%0A%60%60%60%0A%0A%23%23%23%23+Vite%0A%0A1.+Run+%60npm+i+react-grab%40latest%60%0A2.+Add+this+to+your+%60vite.config.ts%60%3A%0A%0A%60%60%60ts%0A%2F%2F+...%0Aimport+%7B+reactGrab+%7D+from+%22react-grab%2Fplugins%2Fvite%22%3B%0A%0Aexport+default+defineConfig%28%7B%0A++plugins%3A+%5B%0A++++%2F%2F+add+react+grab+as+a+plugin%0A++++reactGrab%28%29%2C%0A++%5D%2C%0A%7D%29%3B%0A%60%60%60%0A%0A3.+If+no+framework+or+project+available%2C+ask+the+user+where+it+is+or+what+it+is.+If+there+is+a+project+but+no+framework%2C+then+use%3A%0A%0A%60%60%60html%0A%3Cscript%0A++src%3D%22%2F%2Funpkg.com%2Freact-grab%2Fdist%2Findex.global.js%22%0A++crossorigin%3D%22anonymous%22%0A++data-enabled%3D%22true%22%0A%3E%3C%2Fscript%3E%0A%60%60%60%0A%0ATo+install)

Get started in 1 minute by adding this script tag to your app:

```html
<script
  src="//unpkg.com/react-grab/dist/index.global.js"
  crossorigin="anonymous"
  data-enabled="true"
></script>
```

If you're using a React framework or build tool, view instructions below:

#### Next.js (App router)

Add this inside of your `app/layout.tsx`:

```jsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {/* put this in the <head> */}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
            data-enabled="true"
          />
        )}
        {/* rest of your scripts go under */}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

#### Next.js (Pages router)

Add this into your `pages/_document.tsx`:

```jsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* put this in the <Head> */}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
            data-enabled="true"
          />
        )}
        {/* rest of your scripts go under */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

#### Vite

1. Run `npm i react-grab@latest`
2. Add this to your `vite.config.ts`:

```ts
// ...
import { reactGrab } from "react-grab/plugins/vite";

export default defineConfig({
  plugins: [
    // add react grab as a plugin
    reactGrab(),
  ],
});
```

## Resources & Contributing Back

Want to try it out? Check the [our demo](https://react-grab.com).

Looking to contribute back? Check the [Contributing Guide](https://github.com/aidenybai/react-grab/blob/main/CONTRIBUTING.md) out.

Want to talk to the community? Hop in our [Discord](https://discord.com/invite/G7zxfUzkm7) and share your ideas and what you've build with React Grab.

Find a bug? Head over to our [issue tracker](https://github.com/aidenybai/react-grab/issues) and we'll do our best to help. We love pull requests, too!

We expect all contributors to abide by the terms of our [Code of Conduct](https://github.com/aidenybai/react-grab/blob/main/.github/CODE_OF_CONDUCT.md).

[**→ Start contributing on GitHub**](https://github.com/aidenybai/react-grab/blob/main/CONTRIBUTING.md)

### License

React Grab is MIT-licensed open-source software.
