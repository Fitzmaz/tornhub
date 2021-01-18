
let key = prompt("item key");
let value = localStorage.getItem(key);
let newValue = prompt(key, value);
if (newValue != null) {
    localStorage.setItem(key, newValue);
}
