const displayEl = document.getElementById("display");
const historyEl = document.getElementById("history");
const angleBtn = document.getElementById("angle");

const FUNCTIONS = ["asin", "acos", "atan", "sin", "cos", "tan", "log", "ln", "sqrt"];

let expression = "";
let lastAnswer = 0;
let angleMode = "DEG";
let justEvaluated = false;
let errorState = false;

function toRadians(value) {
  return angleMode === "DEG" ? (value * Math.PI) / 180 : value;
}

function fromRadians(value) {
  return angleMode === "DEG" ? (value * 180) / Math.PI : value;
}

function factorial(n) {
  if (!Number.isFinite(n) || n < 0 || Math.abs(n - Math.round(n)) > 1e-10 || n > 170) {
    throw new Error("Factorial is only defined for whole numbers from 0 to 170.");
  }
  let result = 1;
  for (let i = 2; i <= Math.round(n); i += 1) result *= i;
  return result;
}

function applyFunction(name, value) {
  switch (name) {
    case "sin":
      return Math.sin(toRadians(value));
    case "cos":
      return Math.cos(toRadians(value));
    case "tan": {
      const radians = toRadians(value);
      const cosine = Math.cos(radians);
      if (Math.abs(cosine) < 1e-12) throw new Error("Tangent is undefined for that angle.");
      return Math.sin(radians) / cosine;
    }
    case "asin":
      if (value < -1 || value > 1) throw new Error("Inverse sine needs a value from -1 to 1.");
      return fromRadians(Math.asin(value));
    case "acos":
      if (value < -1 || value > 1) throw new Error("Inverse cosine needs a value from -1 to 1.");
      return fromRadians(Math.acos(value));
    case "atan":
      return fromRadians(Math.atan(value));
    case "log":
      if (value <= 0) throw new Error("Logarithm needs a positive number.");
      return Math.log10(value);
    case "ln":
      if (value <= 0) throw new Error("Natural log needs a positive number.");
      return Math.log(value);
    case "sqrt":
      if (value < 0) throw new Error("Square root needs a number that is zero or greater.");
      return Math.sqrt(value);
    default:
      throw new Error("Unknown function.");
  }
}

function tokenize(source) {
  const tokens = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (char === " " || char === "\t") {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let number = char;
      i += 1;
      while (i < source.length && /[0-9.]/.test(source[i])) {
        number += source[i];
        i += 1;
      }
      if ((number.match(/\./g) || []).length > 1) throw new Error("That number has too many decimal points.");
      tokens.push({ type: "num", value: Number(number) });
      continue;
    }
    if (/[a-z]/i.test(char)) {
      let word = "";
      while (i < source.length && /[a-z]/i.test(source[i])) {
        word += source[i];
        i += 1;
      }
      if (FUNCTIONS.includes(word)) {
        tokens.push({ type: "fn", value: word });
        continue;
      }
      if (word === "pi") {
        tokens.push({ type: "const", value: Math.PI });
        continue;
      }
      if (word === "e") {
        tokens.push({ type: "const", value: Math.E });
        continue;
      }
      if (word === "Ans") {
        tokens.push({ type: "const", value: lastAnswer });
        continue;
      }
      throw new Error("Unknown symbol.");
    }
    if ("+-*/^()!%".includes(char) || char === "−" || char === "×" || char === "÷") {
      const normalized = { "−": "-", "×": "*", "÷": "/" }[char] || char;
      tokens.push({ type: "sym", value: normalized });
      i += 1;
      continue;
    }
    if (char === "π") {
      tokens.push({ type: "const", value: Math.PI });
      i += 1;
      continue;
    }
    throw new Error("Cannot read that expression.");
  }
  return tokens;
}

function evaluate(source) {
  const tokens = tokenize(source);
  let index = 0;

  function peek() {
    return tokens[index];
  }

  function eat() {
    const token = tokens[index];
    index += 1;
    return token;
  }

  function parseExpression() {
    let left = parseTerm();
    while (peek() && peek().type === "sym" && (peek().value === "+" || peek().value === "-")) {
      const operator = eat().value;
      const right = parseTerm();
      left = operator === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parsePower();
    while (peek() && peek().type === "sym" && (peek().value === "*" || peek().value === "/")) {
      const operator = eat().value;
      const right = parsePower();
      if (operator === "/" && right === 0) throw new Error("Cannot divide by zero.");
      left = operator === "*" ? left * right : left / right;
    }
    return left;
  }

  function parsePower() {
    const base = parseUnary();
    if (peek() && peek().type === "sym" && peek().value === "^") {
      eat();
      return Math.pow(base, parsePower());
    }
    return base;
  }

  function parseUnary() {
    if (peek() && peek().type === "sym" && (peek().value === "-" || peek().value === "+")) {
      const operator = eat().value;
      const value = parseUnary();
      return operator === "-" ? -value : value;
    }
    return parsePostfix();
  }

  function parsePostfix() {
    let value = parsePrimary();
    while (peek() && peek().type === "sym" && (peek().value === "!" || peek().value === "%")) {
      const operator = eat().value;
      value = operator === "!" ? factorial(value) : value / 100;
    }
    return value;
  }

  function parsePrimary() {
    const token = peek();
    if (!token) throw new Error("Expression is incomplete.");
    if (token.type === "num" || token.type === "const") {
      eat();
      return token.value;
    }
    if (token.type === "fn") {
      const name = eat().value;
      if (!peek() || peek().value !== "(") throw new Error("Function needs parentheses.");
      eat();
      const argument = parseExpression();
      if (!peek() || peek().value !== ")") throw new Error("Missing closing parenthesis.");
      eat();
      return applyFunction(name, argument);
    }
    if (token.type === "sym" && token.value === "(") {
      eat();
      const value = parseExpression();
      if (!peek() || peek().value !== ")") throw new Error("Missing closing parenthesis.");
      eat();
      return value;
    }
    throw new Error("Expression is incomplete.");
  }

  if (tokens.length === 0) throw new Error("Enter a calculation.");
  const value = parseExpression();
  if (index < tokens.length) throw new Error("Expression is incomplete.");
  if (!Number.isFinite(value)) throw new Error("Result is not a real number.");
  return value;
}

function formatNumber(value) {
  if (Object.is(value, -0)) return "0";
  const rounded = Math.round(value * 1e12) / 1e12;
  const text = rounded.toPrecision(12);
  return String(Number(text));
}

function pretty(source) {
  return source
    .replaceAll("sqrt(", "√(")
    .replaceAll("pi", "π")
    .replaceAll("*", "×")
    .replaceAll("/", "÷")
    .replaceAll("-", "−");
}

function openParenBalance(source) {
  let balance = 0;
  for (const char of source) {
    if (char === "(") balance += 1;
    if (char === ")") balance -= 1;
  }
  return balance;
}

function canPreview(source) {
  if (!source) return false;
  if (/[+\-*/^(]$/.test(source)) return false;
  if (openParenBalance(source) < 0) return false;
  return true;
}

function previewValue(source) {
  const closed = source + ")".repeat(Math.max(0, openParenBalance(source)));
  return evaluate(closed);
}

function render(message) {
  displayEl.textContent = message || (expression ? pretty(expression) : "0");
  if (!message && canPreview(expression)) {
    try {
      historyEl.textContent = `= ${formatNumber(previewValue(expression))}`;
    } catch {
      historyEl.textContent = "";
    }
  } else if (!message) {
    historyEl.textContent = "";
  }
}

function resetEntry() {
  if (justEvaluated || errorState) {
    expression = "";
    justEvaluated = false;
    errorState = false;
  }
}

function endsWithValue() {
  return /[0-9)πe!%]$/.test(expression);
}

function appendMultiplyIfNeeded() {
  if (endsWithValue()) expression += "*";
}

function inputDigit(digit) {
  resetEntry();
  if (endsWithValue() && /[)πe!%]$/.test(expression)) expression += "*";
  expression += digit;
  render();
}

function inputDot() {
  resetEntry();
  if (endsWithValue() && /[)πe!%]$/.test(expression)) expression += "*";
  const match = expression.match(/(\d*\.?\d*)$/);
  const current = match ? match[1] : "";
  if (current.includes(".")) return;
  expression += current === "" ? "0." : ".";
  render();
}

function inputOperator(operator) {
  errorState = false;
  if (justEvaluated) {
    expression = formatNumber(lastAnswer);
    justEvaluated = false;
  }
  if (expression === "") {
    if (operator === "-") expression = "-";
    render();
    return;
  }
  if (/[+\-*/^]$/.test(expression)) {
    if (operator === "-" && !/[+\-*/^]-$/.test(expression) && !expression.endsWith("(")) {
      expression += "-";
    } else if (!expression.endsWith("(")) {
      expression = expression.replace(/[+\-*/^]+$/, operator);
    }
    render();
    return;
  }
  expression += operator;
  render();
}

function inputInsert(text) {
  errorState = false;
  if (justEvaluated && text !== ")" && text !== "!" && text !== "%" && text !== "^2" && text !== "^(-1)") {
    expression = "";
    justEvaluated = false;
  }
  if (justEvaluated && (text === "^2" || text === "^(-1)" || text === "!" || text === "%")) {
    expression = formatNumber(lastAnswer);
    justEvaluated = false;
  }
  if (text === "(" || text === "10^(" || text === "e^(") appendMultiplyIfNeeded();
  if ((text === "^" || text === "^2" || text === "^(-1)" || text === "!" || text === "%") && expression === "") {
    expression = formatNumber(lastAnswer);
  }
  expression += text;
  justEvaluated = false;
  render();
}

function inputFunction(name) {
  resetEntry();
  appendMultiplyIfNeeded();
  expression += `${name}(`;
  render();
}

function inputConstant(name) {
  resetEntry();
  appendMultiplyIfNeeded();
  expression += name === "π" ? "pi" : "e";
  render();
}

function inputAnswer() {
  resetEntry();
  appendMultiplyIfNeeded();
  expression += "Ans";
  render();
}

function deleteLast() {
  if (errorState) {
    expression = "";
    errorState = false;
    render();
    return;
  }
  justEvaluated = false;
  const endings = ["asin(", "acos(", "atan(", "sqrt(", "sin(", "cos(", "tan(", "log(", "ln(", "10^(", "e^(", "Ans", "pi"];
  const match = endings.find((item) => expression.endsWith(item));
  expression = match ? expression.slice(0, -match.length) : expression.slice(0, -1);
  render();
}

function clearAll() {
  expression = "";
  justEvaluated = false;
  errorState = false;
  historyEl.textContent = "";
  render();
}

function toggleSign() {
  if (errorState) return;
  if (justEvaluated) {
    lastAnswer = -lastAnswer;
    expression = formatNumber(lastAnswer);
    displayEl.textContent = expression;
    historyEl.textContent = "Ans";
    return;
  }
  if (expression === "" || expression === "0") {
    expression = "-";
    render();
    return;
  }
  const wrapped = expression.match(/^(.*)\(-(\d*\.?\d+)\)$/);
  if (wrapped) {
    expression = wrapped[1] + wrapped[2];
    render();
    return;
  }
  const number = expression.match(/^(.*?)(\d*\.?\d+)$/);
  if (number && number[2] !== "") {
    expression = `${number[1]}(-${number[2]})`;
    render();
  }
}

function showError(error) {
  errorState = true;
  justEvaluated = false;
  historyEl.textContent = pretty(expression);
  displayEl.textContent = error.message || "Error";
}

function equals() {
  if (!expression || errorState) return;
  try {
    const balance = openParenBalance(expression);
    if (balance < 0) throw new Error("Too many closing parentheses.");
    const source = expression + ")".repeat(balance);
    const value = evaluate(source);
    lastAnswer = value;
    historyEl.textContent = pretty(source);
    expression = formatNumber(value);
    displayEl.textContent = expression;
    justEvaluated = true;
    errorState = false;
  } catch (error) {
    showError(error);
  }
}

document.getElementById("keys").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.digit) inputDigit(button.dataset.digit);
  else if (button.dataset.op) inputOperator(button.dataset.op);
  else if (button.dataset.fn) inputFunction(button.dataset.fn);
  else if (button.dataset.const) inputConstant(button.dataset.const);
  else if (button.dataset.insert) inputInsert(button.dataset.insert);
  else if (button.dataset.action === "dot") inputDot();
  else if (button.dataset.action === "del") deleteLast();
  else if (button.dataset.action === "clear") clearAll();
  else if (button.dataset.action === "sign") toggleSign();
  else if (button.dataset.action === "ans") inputAnswer();
  else if (button.dataset.action === "equals") equals();
});

angleBtn.addEventListener("click", () => {
  angleMode = angleMode === "DEG" ? "RAD" : "DEG";
  angleBtn.textContent = angleMode;
  render();
});

document.addEventListener("keydown", (event) => {
  const key = event.key;
  if (/^[0-9]$/.test(key)) inputDigit(key);
  else if (key === ".") inputDot();
  else if (key === "+" || key === "-" || key === "*" || key === "/") inputOperator(key);
  else if (key === "^") inputInsert("^");
  else if (key === "(" || key === ")") inputInsert(key);
  else if (key === "!") inputInsert("!");
  else if (key === "%") inputInsert("%");
  else if (key === "Enter" || key === "=") {
    event.preventDefault();
    equals();
  } else if (key === "Backspace") deleteLast();
  else if (key === "Escape") clearAll();
  else return;
  event.preventDefault();
});

render();
