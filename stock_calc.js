let num_years;
let stock_price;

let calc_table_vals = 
[[                                '', 'Current Year', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6',
                                      'Year 7'],
 [                         'Revenue', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [                '% Revenue Growth', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [           '% Gross Profit margin', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [              'Operating Expenses', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [               'Interest Expenses', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [                  'Other Expenses', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [                      'Net Income', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [        'Book Value (End of Year)', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
 [       'Share Count (End of Year)', 1.00]]


function clear_calc()
{
    // 1. Reset the control panel's values to their default states.
    document.getElementById('id_input__marginal_tax_rate').value = '15%';
    document.getElementById('id_input__terminal_growth_rate').value = '5%';
    document.getElementById('id_input__equity_capital_opportunity_cost').value = '10%';
    
    // 2. Reset the calculator table's values to their default states.
    calc_table_vals = 
    [[                                '', 'Current Year', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6',
                                      'Year 7'],
    [                         'Revenue', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    [                '% Revenue Growth', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    [           '% Gross Profit margin', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    [              'Operating Expenses', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    [               'Interest Expenses', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    [                  'Other Expenses', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    [                      'Net Income', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    [        'Book Value (End of Year)', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00],
    [       'Share Count (End of Year)', 1.00]]
    
    // 3. Transfer the reset calculator table values to HTML.
    transfer_table_to_html();
    
    // 4. Reset stock price on calculator's display.
     document.getElementById('id_output__predicted_stock_price').value = 'Not Calculated';
}


// Initializes the calculator DOM elements. This function is called when the onload event occurs for the <body>
// element.
function init_calc_page()
{
    // This will set the columns to hidden based on the value of the number of years slider (id = id_input__slider) 
    // when the document is loaded. The slider's default value is 7. The hidden attribute is already applied so that
    // seven years (Year 1 - Year 6) will appear on start up. This is redundant but is called to ensure that the inital
    // number of years matches the value in the number of years slider.
    resize_calc_table();
    transfer_table_to_html();
    format_calc_fields();
}


// Adds commas and percentage signs to fields inside the calculator that require it. This function is set as the target
// for the onfocusout event in the calculator's <article> element. The function will format <input> and <td> & <th>
// elements. This includes elements in both the calculator control panel and the calculator table.
function format_calc_fields()
{
    let ctrl_form = document.getElementById('id_form__calculator_control_panel');
    let calc_table = document.getElementById('id_table__calculator_table');
    let stock_price_text = document.getElementById('id_output__predicted_stock_price');
    
    let rows = document.getElementById('id_table__calculator_table').rows;

    let ctrl_children = ctrl_form.children;
    let calc_children = calc_table.chidlren;
    
    let orig_value = '', final_value = '';

    // 1. Format the <input> elements inside of the calculator control panel.
    for(let i = 0; i < ctrl_children.length; i++)
    {
        // Skips the slider inside the calculator control panel. Only select the three <input> elements of type text 
        // (marginal tax rate entry, terminal growth rate entry, and equity capital opportunity cost entry) .
        if(ctrl_children[i].tagName == 'INPUT' && ctrl_children[i].getAttribute('type') == 'text')
        {
            orig_value = ctrl_children[i].value;
            final_value = format_str_numerical(orig_value, 'percent');
            ctrl_children[i].value = final_value;
        }
    }

    // 2. Format the <th> and <td> elements inside of the calculator table. Do not include the first row or first column
    // (from left). These cells do not contain numeirc data that needs to be formatted.
    for(let i = 1; i < rows.length; i++)
    {
        let cur_row = rows[i].cells;

        for(let j = 1; j < cur_row.length; j++)
        {
            let cur_cell = cur_row[j];

            orig_value = table_cell_retrieve(cur_cell);

            // Rows with indices 2 and 3 (Revenue Growth % and Gross Margin %) must be displayed as percentages.
            if(i == 2 || i == 3)
                final_value = format_str_numerical(orig_value, 'percent');
            else
                final_value = format_str_numerical(orig_value, 'number');
            
            table_cell_store_text(cur_cell, final_value);
        }
    }

    // 3. Format the <p> element that stores the stock price.
    orig_value = document.getElementById('id_output__predicted_stock_price').innerHTML;
    final_value = format_str_numerical(orig_value, 'number');

    document.getElementById('id_output__predicted_stock_price').innerHTML = final_value;
}


// Accepts a string. It will remove any non-numerical characters from the string other than a negative sign or a 
// period character. The function will add commas in the whole number portion of the string.

// The mode must be input as well. A mode of "percent" will add a percent sign to the string. A mode of "number" will
// not add a percent sign. If an incorrect mode is passed, the original string is returned.
function format_str_numerical(str, mode)
{
    if(mode != 'percent' && mode != 'number')
        return str;

    let formatted_str = '';
    let has_period_char = str.includes('.');
    let parts = str.split('.');

    formatted_str = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    if(has_period_char)
        formatted_str += '.' + parts[1];
    if(mode == 'percent')
    {
        if(str.charCodeAt(str.length - 1) != 37 && str != '-')     // Char code for '%'.
            formatted_str = formatted_str + '%';
    }
 
    return formatted_str;
}


// Returns a number for a given string. The function filters out any non-numeric characters but will allow  the '.' 
// character. Returns NaN if the string cannot be represented as a number after filtering.
function get_float_from_str(str)
{
    return parseFloat(str.replace(/[^\d.-]/g, ''));
}


// Resizes the calculator table. This is done by taking the amount of years the user indicated they wanted to see
// with the slider.
function resize_calc_table()
{
    // The number of projection years (Year 1 and beyond).
    num_years = parseInt(document.getElementById('id_input__slider').value);

    // 'idx_hidden' is the beginning index for all rows where the table should not be displayed.
    // For row ['Year', 'Current Year', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7'], if 
    // num_years is 1, then everything after 'Year 1' is be hidden. 'Year 1' would still be displayed'. Recall that 
    // num_years is the number of years that is being modeled beyond the current year.
    let idx_hidden = 2 + num_years;
    let rows = document.getElementById('id_table__calculator_table').rows;

    // Iterate through the cells in each row. If the cell's index is greater than idx_hidden, do not display that cell.
    for(let i = 0; i < rows.length; i++)
    {
        let cur_row = rows[i].cells;

        for(let j = 0; j < cur_row.length; j++)
        {
            let cur_cell = cur_row[j];
            if(j < idx_hidden)
                cur_cell.hidden = false;
            else
                cur_cell.hidden = true;
        }
    }
}


// Recomputes revenue growth, net income, book value, and stock price and stores values in internal storage. Rounds
// any computed values to two decimal points.
function recompute_model()
{
    let new_val = 0.00;
    let rev_row             = calc_table_vals[1];
    let rev_growth_row      = calc_table_vals[2];
    let gross_marg_row      = calc_table_vals[3];
    let op_exp_row          = calc_table_vals[4];
    let int_exp_row         = calc_table_vals[5];
    let oth_exp_row         = calc_table_vals[6];
    let net_inc_row         = calc_table_vals[7];
    let book_val_row        = calc_table_vals[8];
    
    let equity_ror          = get_float_from_str(document.getElementById('id_input__equity_capital_opportunity_cost')
                                                                          .value);
    let marg_tax_rate       = get_float_from_str(document.getElementById('id_input__marginal_tax_rate').value);
    let term_growth_rate    = get_float_from_str(document.getElementById('id_input__terminal_growth_rate').value);
    let num_shares          = get_float_from_str(document.getElementById('id_input__num_shares_outstanding').value);
    
    let discounted_residuals_ttl = 0, terminal_residual = 0;
    let row_len = rev_row.length;

    // 1. Compute revenue for each year. 2 is the starting column for revenue that needs to be computed.
    for(let i = 2; i < row_len; i++)
    {
        new_val = rev_row[i - 1] + Math.abs(rev_row[i-1]) * (rev_growth_row[i]/100);
        rev_row[i] = Math.round(new_val * 100)/100;
    }

    // 2. Compute net income for each year. 
    for(let i = 1; i < row_len; i++)
    {
        new_val = (1 - marg_tax_rate/100) *
                  (rev_row[i] * (gross_marg_row[i]/100) - op_exp_row[i] - int_exp_row[i] - oth_exp_row[i]);
        net_inc_row[i] = Math.round(new_val * 100)/100;
    }

    // 3. Compute book value for each year.
    for(let i = 2; i < row_len; i++)
    {
        new_val = net_inc_row[i - 1] + book_val_row[i - 1];
        book_val_row[i] = Math.round(new_val * 100)/100;
    }

    // 4. Transfer the recomputed rows back to internal storage.
    calc_table_vals[1] = rev_row;
    calc_table_vals[7] = net_inc_row;
    calc_table_vals[8] = book_val_row;

    // 5. Compute stock price and store in internal storage. Only compute up to the amount of years being displayed 
    // (num_years).
    for(let i = 2; i < num_years + 2; i++)
    {
        let resid_income = (net_inc_row[i] - book_val_row[i - 1] * (equity_ror/100))
                           /(Math.pow(1 + equity_ror/100, i - 1));
        discounted_residuals_ttl += resid_income;
        
        // Terminal value is added for the last year in the model.
        if(i + 1 == num_years)
        {
            terminal_residual = resid_income / (equity_ror/100 - term_growth_rate/100);
            discounted_residuals_ttl += terminal_residual/(Math.pow(1 + equity_ror/100, i - 1));
        }
    }

    // 6. The total discounted residual value is added to initial book value. (See wikipedai article on 
    // "Residual Income Valuation". Store the stock price.
    stock_price = (book_val_row[1] + discounted_residuals_ttl)/num_shares;
}


// Stores text information in the <td> and <th> table cell elements of the calculator table so that it can be displayed.
function table_cell_store_text(cell, str)
{
    // This if statement distinguishes between <td> and <th> elements do not have an <input> child vs. <td> and <th>
    // elements that do have an <input> child. If the number of child nodes is greater than 1, the <td> or <th>
    // element has an <input> child element at position 1. This is based on the structure of the HTML file associated
    // with this function.

    // If there is no <input> child, the textContent of the <td> or <th> element must be  changed. If the <td> or <th>
    // element  has an <input> child, the value of the <input> child must be changed, not the parent's textContent.
    if(cell.childNodes.length > 1)                             // Has an <input> child, modify <input> child's value.
        cell.childNodes[1].value = str;
    else                                                       // No <input> child, modify textContent of parent.
        cell.textContent = str;
}


// Retrieves text information from the <td> and <td> table cell elements of the calculator table.
function table_cell_retrieve(cell)
{
    // This if statement distinguishes between <td> and <th> elements do not have an <input> child vs. <td> and <th>
    // elements that do have an <input> child. If the number of child nodes is greater than 1, the <td> or <th>
    // element has an <input> child element at position 1. This is based on the structure of the HTML file associated
    // with this function.

    // If there is no <input> child, the textContent of the <td> or <th> element must be be acquired. If the <td> or
    // <th> element has an <input> child, the value of the <input> child must be acquired, not the parent's textContent.
    if(cell.childNodes.length > 1)                             // Has an <input> child, acquire <input> child's value.
        return cell.childNodes[1].value;
    else                                                       // No <input> child, acquire textContent of parent.
        return cell.textContent;
}


// Stores the stock price to the stock price <output> element.
function transfer_price_to_html()
{
    // Ensures that numerical values are outputted with 2 digits shown.
    let rounded_price = stock_price.toLocaleString("en", {useGrouping: false, minimumFractionDigits: 2});
    document.getElementById('id_output__predicted_stock_price').value = rounded_price;
}


// This function transfers information from the calculator table in HTML to internal storage called "calc_table_vals".
// Also, rounds any input from the HTML input fields to two decimal places.
function transfer_html_to_table()
{
    let rows = document.getElementById('id_table__calculator_table').rows;

    // Start at i = 1 and j = 1 to start at data cells. Notice that column with index = 0 and row with index = 0, do
    // not contain any input fields. See "id_table__calculator_table" for the HTML definition of the calculator table.
    for(let i = 1; i < rows.length; i++)
    {
        let cur_row = rows[i].cells;
        let str_value = '',  sanitized_value = '';
        let float_value = 0.00;

        for(let j = 1; j < cur_row.length; j++)
        {
            let cur_cell = cur_row[j];
            
            str_value = table_cell_retrieve(cur_cell);

            // Remove any non-numeric characters and period characters. If there is more than one period character,
            // parseFloat will return NaN and the model will set the value to 0. Since verify_numerical() removes
            // extra decimal points on input, extra decimal points aren't expected.
            sanitized_value = get_float_from_str(str_value);
            float_value = parseFloat(sanitized_value);

            // isNaN() will return true if a cell contains a value such as '-' or if it otherwise can't be processed
            // as a float. Values that can't be processed are interpretted as being 0.
            if(isNaN(float_value))
                calc_table_vals[i][j] = 0.00;
            else
                calc_table_vals[i][j] = Math.round(float_value * 100)/100;
        }
    }
}


// This function transfers information from calc_table_vals to the HTML of the calculator table. This function does
// not apply any formatting. The format_calc_fields() function should  be called after this function to format the 
// calculator's numerical fields.
function transfer_table_to_html()
{
    let calc_table = document.getElementById('id_table__calculator_table');
    let calc_children = calc_table.getElementsByTagName("*");
    
    let str_value = '';

    let rows = document.getElementById('id_table__calculator_table').rows;

    // Iterate through the cells in each row. If the cell's index is greater than idx_hidden, do not display that cell.
    for(let i = 0; i < rows.length; i++)
    {
        let cur_row = rows[i].cells;

        for(let j = 0; j < cur_row.length; j++)
        {
            let cur_cell = cur_row[j];

            if(calc_table_vals[i][j] == '0.00')
                str_value = '-';
            else
                // Ensures that numerical values are outputted with 2 digits shown.
                str_value = calc_table_vals[i][j].toLocaleString("en", {useGrouping: false, minimumFractionDigits: 2});

            table_cell_store_text(cur_cell, str_value);
        }
    }
}


// This function accepts an event. In this project, the event is an InputEvent originating from an <input> element in an
// HTML document. The <input> element must have the type attribute set to text. The <input> element's oninput attribute 
// is set to call this function.
//
// This function will set the value of the triggering <input> element to remove any character that isn't numeric
// ('0' through '9') or a single '.' character. This will make it so that user's input into <input> elements are 
// formatted as a number. Any additional '.' characters will be removed beyond the first one.
//
// The main purpose of this function is to format input while the user is entering values in the calculator. This will
// only allow the user to enter numeric data and a single '.' character.
function verify_numerical_while_inputting(event)
{
    let targ_element = event.target;
    // orig_value should be a string since this function must be called by an element with its "type" attribute set to 
    // text.
    let orig_value = targ_element.value;
    let sanitized_value = '', final_value = '';
    let has_period_char = false;

    // 1. Only include numeric characters from '0' to '9' and a single '.'. 
    for(let i = 0; i < orig_value.length; i++)
    {
        let char_code = orig_value.charCodeAt(i);
        if((char_code >= 48 && char_code <= 57))    // Char codes for '0' through '9'.
            sanitized_value += orig_value[i];

        // Only include one '.' character in a number.
        if(char_code == 46 && !has_period_char)     // Char code for '.'.
        {
            sanitized_value += orig_value[i];
            has_period_char = true;
        }
    }

    // 2. Build the final string that will contain commas in the whole number portion (i.e. to the left of '.').
    let parts = sanitized_value.split('.');

    final_value = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if(has_period_char)
        final_value = final_value + '.' + parts[1];
    if(orig_value[0] == '-')
        final_value = '-' + final_value;
    
    // 3. Transfer the final string to the <input> element's value.
    targ_element.value = final_value;
}

// This function should be used with the onfocusin event. If an <input> element triggers this event, the <input>
// element's value is changed if its current value is '-'. This would occur on a blank input cell in the calculator
// table. 
function remove_empty_char_on_focus(event)
{
    let targ_element = event.target;

    if(targ_element.nodeName != 'INPUT')
        return;

    let str_value = targ_element.value;

    if(str_value == '-')
        targ_element.value = '';
}