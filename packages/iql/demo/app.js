const iql = require("../dist");
const { attributes } = require("./attributes.js");

/* Fetch element ids */
const dataTextBox = document.getElementById("data");
const queryTextBox = document.getElementById("query");
const validationTextBox = document.getElementById("validation");

function highlightMatches(indices = []) {
    /* Clear existing preview */
    dataTextBox.innerHTML = "";

    /* Redraw data with highlights */
    for (let ii = 0; ii < attributes.length; ii++) {
        const content = JSON.stringify(attributes[ii], null, 2);
        let format = "";
        if (indices.includes(ii)) {
            format = " style='font-weight:bold;background-color:#dcf2df'";
        }
        dataTextBox.innerHTML += `<pre${format}>${content}</pre>`;
    }
}

/* Bootstrap */
const iqlQueryString = queryTextBox.value;
const matches = iql.execute(iqlQueryString, attributes);
highlightMatches(matches);

/* Arm hooks */
queryTextBox.addEventListener("input", (e) => {
    const iqlQueryString = queryTextBox.value;
    const validationResult = iql.validate(iqlQueryString);
    if (!validationResult.isValid) {
        queryTextBox.style.borderColor = "red";
        queryTextBox.style.outlineColor = "red";
        validationTextBox.value = " ".repeat(validationResult.error.location.start.column - 1) + "^\n" + "Error: " + validationResult.error.message;
        highlightMatches([]);
    } else {
        queryTextBox.style.borderColor = "black";
        queryTextBox.style.outlineColor = "black";
        validationTextBox.value = "";

        const matches = iql.execute(iqlQueryString, attributes);
        highlightMatches(matches);
    }
});
