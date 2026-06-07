import Fraction from "fraction.js";
import { RendererObject, Tokens } from "marked";
import { Repository } from "./Recipedata";
import { convertTemperature, simplifyUnit } from "./units";
// Override function

// HELPERS FROM https://github.com/markedjs/marked/blob/master/src/helpers.ts
function escape(html: string, encode?: boolean) {
  const escapeReplacements: { [index: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  const getEscapeReplacement = (ch: string) => escapeReplacements[ch];
  if (encode) {
    if (/[&<>"']/.test(html)) {
      return html.replace(/[&<>"']/g, getEscapeReplacement);
    }
  } else {
    if (/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/.test(html)) {
      return html.replace(/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, getEscapeReplacement);
    }
  }

  return html;
}
function cleanUrl(href: string) {
  try {
    href = encodeURI(href).replace(/%25/g, '%');
  } catch {
    return null;
  }
  return href;
}

function imageRenderer(root: string): RendererObject {
  return {
    image({ href, title, text }: Tokens.Image): string {
      const cleanHref = cleanUrl(new URL(href, root).href);
      if (cleanHref === null) {
        return escape(text);
      }
      href = cleanHref;

      let out = `<img src="${href}" alt="${text}" onerror="console.info('Broken image: ${href}'); this.remove()"`;
      if (title) {
        out += ` title="${escape(title)}"`;
      }
      out += '>';
      return out;
    }
  }
}


function linkRenderer(repos: Repository[]): RendererObject {
  return {
    link({ href, title, tokens }: Tokens.Link): string {
      const text = this.parser.parseInline(tokens);
      const cleanHref = cleanUrl(href);
      if (cleanHref === null) {
        return text;
      }
      href = cleanHref;
      const url = new URL(href, window.location.href);
      // resolve simple relative paths
      if (url.origin === new URL(window.location.href).origin && url.pathname.endsWith(".md")) {
        href = url.href.replace(".md", "");
      }
      // resolve absolute paths (to other repositories)
      const repoMatcher = repos.map(repo => new RegExp(`^https://(github|raw.githubusercontent).com/${repo.author}/${repo.repository}/.*\.md$`, 'g'));
      const match = repoMatcher.findIndex(prefix => prefix.test(href));
      if (match > -1) {
        href = `/${repos[match].author}/${href.split(`/${repos[match].branch}/`)[1].replace(/.md$/, '')}`;
      }

      let out = '<a href="' + href + '"';
      if (title) {
        out += ' title="' + (escape(title)) + '"';
      }
      out += '>' + text + '</a>';
      return out;
    }
  }
}

function replaceUnicodeFractions(str: string) {
  const mapObj: Record<string, string> = { "¼": "1/4", "½": "1/2", "¾": "3/4", "⅐": "1/7", "⅑": "1/9", "⅒": "1/10", "⅓": "1/3", "⅔": "2/3", "⅕": "1/5", "⅖": "2/5", "⅗": "3/5", "⅘": "4/5", "⅙": "1/6", "⅚": "5/6", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8", "⅟": "1/", "↉": "0/3" };
  const re = new RegExp(Object.keys(mapObj).join("|"), "gi");

  return str.replace(re, function(matched) {
    return mapObj[matched.toLowerCase()];
  });
}

function splitAmountList(list: string): string[] {
  return list === "" ? [] : list.replaceAll("–", "-").split(/(?<!\d),|,(?!\d)/);
}

function splitAmountUnit(amount: string): string[] {
  const isComma = amount.includes(",");
  const num = /([0-9.,/]+)\s?[-]?\s?([0-9.,/]*)(.*)/.exec(amount.replace(",", "."));
  if (num) {
    if (num[2] !== "") {
      // second part of range
      const res = `${num[1]}-${num[2]}`;
      return [isComma ? res.replaceAll(".", ",") : res, num[3]];
    }
    return [isComma ? num[1].replace(".", ",") : num[1], num[3]];
  }
  return [amount];
}

function multiplyAmount(amount: string, multiplier: number): string {
  const isComma = amount.includes(",");
  const isFrac = amount.includes("/");

  function calc(input: string): { match: string, replacement: string } {
    const split = /([0-9,.\/\s]+)(.*)/.exec(input);
    if (!split || split.length < 3) {
      throw new Error('Could not match amount in target');
    }
    const quantity = split[1].trim();
    const unit = split[2].trim();
    try {
      const approximateThirds = quantity.replace(/.33$/, '.333333').replace(/.6(6|7)$/, '.66667');
      const { quantity: product, unit: newUnit } = simplifyUnit(new Fraction(approximateThirds).mul(multiplier), unit);
      const decimals = "" + parseFloat(product.valueOf().toFixed(2));
      return { match: split[0].trim(), replacement: (isFrac ? product.toFraction(true) : (isComma ? decimals.replace(".", ",") : decimals)) + " " + newUnit };
    } catch {
      return { match: split[0].trim(), replacement: input };
    }
  }
  const range = amount.replace(',', '.').split(/(-|bis|to)/);

  if (range.length > 0) {
    const resultLeft = calc(range[0]);

    try {
      if (range.length > 2) {
        // second part of range
        const resultRight = calc(range[2]);
        return amount.replace(",", ".").replace(range.join(''), [
          range[0].replace(resultLeft.match, resultLeft.replacement),
          range[1],
          range[2].replace(resultRight.match, resultRight.replacement)
        ].join(''));
      }
    } catch (e) {
      // failsafe for false-positive matches
      console.info(e);
    }
    return amount.replace(",", ".").replace(resultLeft.match, resultLeft.replacement);
  }
  return amount;

}

function temperatureRenderer(): RendererObject {
  return {
    text(token: Tokens.Text | Tokens.Escape): string {
      if (token.text.includes("<button class=\"temperature\"")) {
        return token.text;
      }
      token.text = token.text.replace(/[0-9]+[\s°]*(C|F)/g, (match: string) => { return `<button class="temperature" onclick="this.innerText = this.innerText === '${match}' ? '${convertTemperature(match)}' : '${match}'">${match}</button>`; });
      return token.text;
    }
  };
}

function ingredientRenderer(multiplier: number = 1): RendererObject {
  return {
    em({ tokens }: Tokens.Em): string {
      const content = replaceUnicodeFractions(this.parser.parseInline(tokens));
      return `<em>${multiplyAmount(content, multiplier)}</em>`;
    },
    listitem(item: Tokens.ListItem): string {
      let itemBody = '';
      let label = '';
      try {
        label = stripHtml(this.parser.parse(item.tokens));
      } catch {
        /* we should not crash on a faulty label */
        console.error('could not parse ingredient format');
      }
      const checkbox = '<input checked="" type="checkbox" name="' + label + '">';
      if (item.loose) {
        if (item.tokens[0]?.type === 'paragraph') {
          item.tokens[0].text = checkbox + ' ' + item.tokens[0].text;
          if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === 'text') {
            item.tokens[0].tokens[0].text = checkbox + ' ' + escape(item.tokens[0].tokens[0].text);
            item.tokens[0].tokens[0].escaped = true;
          }
        } else {
          item.tokens.unshift({
            type: 'text',
            raw: checkbox + ' ',
            text: checkbox + ' ',
            escaped: true,
          });
        }
      } else {
        itemBody += checkbox + ' ';
      }


      itemBody += this.parser.parse(item.tokens, !!item.loose);

      return `<li><label>${itemBody}</label></li>\n`;
    },
    paragraph({ tokens }: Tokens.Paragraph): string {
      return `${this.parser.parseInline(tokens)}\n`;
    }
  }
}

function stripParagraphs(): RendererObject {
  return {
    paragraph({ tokens }: Tokens.Paragraph): string {
      return `${this.parser.parseInline(tokens)}\n`;
    }
  }
}

function stripHtml(input: string): string {
  return input.replaceAll(/<\/?[a-z][a-z0-9]*[^<>]*>|<!--.*?-->/g, '');
}

export { imageRenderer, linkRenderer, ingredientRenderer, splitAmountList, multiplyAmount, splitAmountUnit, stripParagraphs, temperatureRenderer };
