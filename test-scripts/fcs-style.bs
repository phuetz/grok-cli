// Grok Script - FCS-style Demo
// Testing features inspired by FileCommander Script

console.log("=" * 60)
console.log(" Grok Script - FCS-style Features Demo")
console.log("=" * 60)

// === 1. Range Function ===
console.log("\n[1] RANGE FUNCTION")
console.log("-" * 40)

let sum = 0
for i in range(1, 11) {
  sum = sum + i
}
console.log("Sum 1-10: " + sum)

// Range with step
let evens = []
for i in range(0, 10, 2) {
  evens = push(evens, i)
}
console.log("Evens: " + JSON.stringify(evens))

// === 2. String Operations ===
console.log("\n[2] STRING OPERATIONS")
console.log("-" * 40)

let border = "+" + "-" * 20 + "+"
console.log(border)
console.log("| String repetition  |")
console.log(border)

// === 3. Array Operations ===
console.log("\n[3] ARRAY OPERATIONS")
console.log("-" * 40)

let arr = [1, 2, 3]
arr = push(arr, 4, 5)
console.log("Array after push: " + JSON.stringify(arr))
console.log("Array length: " + len(arr))

let k = keys({a: 1, b: 2, c: 3})
console.log("Object keys: " + JSON.stringify(k))

// === 4. File Operations ===
console.log("\n[4] FILE OPERATIONS")
console.log("-" * 40)

// Create test file
let testData = "Line 1\nLine 2\nLine 3"
file.write("./test-output.txt", testData)
console.log("Wrote test file")

// Read it back
let content = file.read("./test-output.txt")
console.log("Read back: " + len(content) + " chars")

// List directory
let files = file.list(".")
console.log("Files in current dir: " + len(files))

// Clean up
file.delete("./test-output.txt")

// === 5. Bash Integration ===
console.log("\n[5] BASH INTEGRATION")
console.log("-" * 40)

let dateResult = bash.exec("date +%Y-%m-%d")
console.log("Today: " + dateResult)

let hostnameResult = bash.exec("hostname")
console.log("Hostname: " + hostnameResult)

// === 6. Control Flow ===
console.log("\n[6] CONTROL FLOW")
console.log("-" * 40)

// For-in loop with object
let config = {name: "grok", version: "1.0", enabled: true}
for key in keys(config) {
  console.log("  " + key + ": " + config[key])
}

// While loop
let count = 0
while (count < 5) {
  count = count + 1
}
console.log("While counted to: " + count)

// Ternary
let status = count > 3 ? "HIGH" : "LOW"
console.log("Status: " + status)

// === 7. Functions ===
console.log("\n[7] FUNCTIONS")
console.log("-" * 40)

function factorial(n) {
  if (n <= 1) {
    return 1
  }
  return n * factorial(n - 1)
}

console.log("5! = " + factorial(5))
console.log("10! = " + factorial(10))

// Arrow function style (simulated)
function double(x) {
  return x * 2
}

let nums = [1, 2, 3, 4, 5]
let doubled = []
for n in nums {
  doubled = push(doubled, double(n))
}
console.log("Doubled: " + JSON.stringify(doubled))

// === Summary ===
console.log("\n" + "=" * 60)
console.log(" All FCS-style features working!")
console.log("=" * 60)
