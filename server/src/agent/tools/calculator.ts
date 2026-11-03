import { dynamicTool } from "ai"
import { z } from "zod"

export const calculatorTool = () =>
  dynamicTool({
    title: "Rechner",
    description:
      "Evaluates an arithmetic expression exactly. Use it for every " +
      "calculation instead of doing math yourself. Supports + - * / % ^, " +
      "parentheses, pi, e and the functions " +
      `${Object.keys(FUNCTIONS).join(", ")}. Use a dot as decimal separator.`,
    inputSchema: z.object({
      expression: z.string().describe("For example: (17.5 * 3) ^ 2 / sqrt(2)"),
    }),
    execute: async (input) => {
      const { expression } = input as { expression: string }
      try {
        return { expression, result: evaluate(expression) }
      } catch (error) {
        return { expression, error: (error as Error).message }
      }
    },
  })

const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
}

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E }

/**
 * A small recursive descent parser, so the model's input is never run as
 * code. Precedence from low to high: + -, * / %, unary minus, ^ (right
 * associative, so 2^3^2 = 2^9 and -2^2 = -4).
 */
export function evaluate(expression: string): number {
  const tokens =
    expression.toLowerCase().match(/\d*\.?\d+(?:e[+-]?\d+)?|[a-z]+|\*\*|\S/g) ??
    []
  let position = 0
  const peek = () => tokens[position]
  const next = () => tokens[position++]
  const expect = (token: string) => {
    if (next() !== token) throw new Error(`expected "${token}"`)
  }

  function sum(): number {
    let value = product()
    while (peek() === "+" || peek() === "-") {
      value = next() === "+" ? value + product() : value - product()
    }
    return value
  }

  function product(): number {
    let value = unary()
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const operator = next()
      const right = unary()
      if (operator === "*") value *= right
      else if (operator === "/") value /= right
      else value %= right
    }
    return value
  }

  function unary(): number {
    if (peek() === "-" || peek() === "+") {
      const sign = next() === "-" ? -1 : 1
      return sign * unary()
    }
    return power()
  }

  function power(): number {
    const base = atom()
    if (peek() === "^" || peek() === "**") {
      next()
      return base ** unary()
    }
    return base
  }

  function atom(): number {
    const token = next()
    if (token === undefined) throw new Error("unexpected end of expression")
    if (token === "(") {
      const value = sum()
      expect(")")
      return value
    }
    if (/^[\d.]/.test(token)) return Number(token)
    if (token in CONSTANTS) return CONSTANTS[token]
    if (token in FUNCTIONS) {
      expect("(")
      const argument = sum()
      expect(")")
      return FUNCTIONS[token](argument)
    }
    throw new Error(`unknown token "${token}"`)
  }

  const value = sum()
  if (position < tokens.length) {
    throw new Error(`unexpected "${tokens[position]}"`)
  }
  if (!Number.isFinite(value)) throw new Error("result is not a finite number")
  // Hides floating point noise like 0.1 + 0.2 = 0.30000000000000004.
  return Number(value.toPrecision(12))
}
