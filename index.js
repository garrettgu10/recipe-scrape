const puppeteer = require('puppeteer');
const fs = require('fs');

let browser;

const recipes = JSON.parse(fs.readFileSync("recipes.json"));
const visited_names = new Set(recipes.map(r => r.name));

async function scrape(url) {
    if(!url.startsWith("https://www.budgetbytes.com/")){
        return;
    }

    const page = await browser.newPage();
    await page.goto(url);
    
    const hasRecipe = await page.evaluate(() => {
        return document.querySelector(".wprm-recipe") !== null;
    });

    if(!hasRecipe) {
        return null;
    }

    let recipe;

    console.log(await page.evaluate(() => document.querySelector(".title").textContent));

    try {
        recipe = await page.evaluate(() => {
            const ingredientElems = document.querySelectorAll(".wprm-recipe-ingredient");

            const ingredients = [];
            for(let i = 0; i < ingredientElems.length; i++) {
                const ingredientElem = ingredientElems[i];

                let quantity = "";
                try {
                    quantity = ingredientElem.querySelector(".wprm-recipe-ingredient-amount").innerText;
                } catch(e) {}
                let unit = "";
                try {
                    unit = ingredientElem.querySelector(".wprm-recipe-ingredient-unit").innerText.trim();
                }catch(e) {}
                const name = ingredientElem.querySelector(".wprm-recipe-ingredient-name").innerText.trim();
                let price = 0;
                try{
                    price = parseFloat(ingredientElem.querySelector(".wprm-recipe-ingredient-notes").innerText.substring(2));
                } catch(e) {}

                ingredients.push({quantity, unit, name, price});
            }

            const name = document.querySelector(".title").textContent;

            const description = document.querySelector(".wprm-recipe-summary").innerText;

            const time = document.querySelector(".wprm-recipe-total_time").innerText;

            const instructionElems = document.querySelectorAll(".wprm-recipe-instruction");
            const instructions = [];
            for(let i = 0; i < instructionElems.length; i++) {
                const instructionElem = instructionElems[i];
                instructions.push(instructionElem.innerText);
            }

            const img = document.querySelector(".wprm-recipe-image > img").getAttribute("data-pin-media");

            return {name, img, description, time, ingredients, instructions};
        });
    }catch(e) {
        console.log(e);
        return null;
    }
    
    recipe.source = page.url();
    await page.close();
    
    if (visited_names.has(recipe.name)) {
        return null;
    }

    console.log(recipe.name);

    return recipe;
}
(async() => {
    browser = await puppeteer.launch({
        headless: true,
    });

    while(true) {
        recipes.push(await scrape("https://www.budgetbytes.com/random/"));
    }
})();

process.on('SIGINT', function() {

    fs.writeFileSync("recipes.json", JSON.stringify(recipes));

    browser.close().then(() => {process.exit()});
});