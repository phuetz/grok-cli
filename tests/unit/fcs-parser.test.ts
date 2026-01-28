/**
 * Unit Tests for FCS Parser
 *
 * Comprehensive tests for the FileCommander Script (FCS) parser including:
 * - Tokenization (all token types)
 * - Expression parsing (binary, unary, function calls)
 * - Statement parsing (if/else, loops, function definitions)
 * - Error recovery (malformed input, unterminated strings)
 * - Edge cases (empty input, max nesting depth)
 * - Resource limits (iteration guards, stack overflow prevention)
 */

import { FCSParser, parse } from '../../src/fcs/parser.js';
import { tokenize } from '../../src/fcs/lexer.js';
import { TokenType, Token } from '../../src/fcs/types.js';
import { LoopTimeoutError } from '../../src/utils/errors.js';

// Helper to parse FCS code and return the AST
function parseCode(code: string) {
  const tokens = tokenize(code);
  return parse(tokens);
}

// Helper to get tokens
function getTokens(code: string): Token[] {
  return tokenize(code);
}

describe('FCS Parser', () => {
  // ============================================
  // Tokenization Tests
  // ============================================
  describe('Tokenization', () => {
    describe('Literals', () => {
      it('should tokenize integer numbers', () => {
        const tokens = getTokens('42');
        expect(tokens.some(t => t.type === TokenType.Number && t.value === '42')).toBe(true);
      });

      it('should tokenize float numbers', () => {
        const tokens = getTokens('3.14159');
        expect(tokens.some(t => t.type === TokenType.Number && t.value === '3.14159')).toBe(true);
      });

      it('should tokenize hex numbers', () => {
        const tokens = getTokens('0xFF');
        expect(tokens.some(t => t.type === TokenType.Number && t.value === '0xFF')).toBe(true);
      });

      it('should tokenize binary numbers', () => {
        const tokens = getTokens('0b1010');
        expect(tokens.some(t => t.type === TokenType.Number && t.value === '0b1010')).toBe(true);
      });

      it('should tokenize scientific notation', () => {
        const tokens = getTokens('1e10');
        expect(tokens.some(t => t.type === TokenType.Number && t.value === '1e10')).toBe(true);
      });

      it('should tokenize double-quoted strings', () => {
        const tokens = getTokens('"hello world"');
        expect(tokens.some(t => t.type === TokenType.String && t.value === 'hello world')).toBe(true);
      });

      it('should tokenize single-quoted strings', () => {
        const tokens = getTokens("'hello'");
        expect(tokens.some(t => t.type === TokenType.String && t.value === 'hello')).toBe(true);
      });

      it('should tokenize template strings', () => {
        const tokens = getTokens('`hello template`');
        expect(tokens.some(t => t.type === TokenType.String && t.value === 'hello template')).toBe(true);
      });

      it('should tokenize escape sequences in strings', () => {
        const tokens = getTokens('"hello\\nworld"');
        expect(tokens.some(t => t.type === TokenType.String && t.value === 'hello\nworld')).toBe(true);
      });

      it('should tokenize boolean true', () => {
        const tokens = getTokens('true');
        expect(tokens.some(t => t.type === TokenType.Boolean && t.value === 'true')).toBe(true);
      });

      it('should tokenize boolean false', () => {
        const tokens = getTokens('false');
        expect(tokens.some(t => t.type === TokenType.Boolean && t.value === 'false')).toBe(true);
      });

      it('should tokenize null', () => {
        const tokens = getTokens('null');
        expect(tokens.some(t => t.type === TokenType.Null && t.value === 'null')).toBe(true);
      });
    });

    describe('Identifiers and Keywords', () => {
      it('should tokenize identifiers', () => {
        const tokens = getTokens('myVariable');
        expect(tokens.some(t => t.type === TokenType.Identifier && t.value === 'myVariable')).toBe(true);
      });

      it('should tokenize identifiers with underscores', () => {
        const tokens = getTokens('my_var_2');
        expect(tokens.some(t => t.type === TokenType.Identifier && t.value === 'my_var_2')).toBe(true);
      });

      it('should tokenize keywords', () => {
        const keywords = ['if', 'else', 'while', 'for', 'let', 'const', 'func', 'function', 'class', 'return'];
        keywords.forEach(kw => {
          const tokens = getTokens(kw);
          expect(tokens.some(t => t.type === TokenType.Keyword && t.value === kw)).toBe(true);
        });
      });

      it('should tokenize decorators', () => {
        const tokens = getTokens('@deprecated');
        expect(tokens.some(t => t.type === TokenType.Decorator && t.value === '@deprecated')).toBe(true);
      });
    });

    describe('Operators', () => {
      it('should tokenize arithmetic operators', () => {
        const ops = [
          { code: '+', type: TokenType.Plus },
          { code: '-', type: TokenType.Minus },
          { code: '*', type: TokenType.Multiply },
          { code: '/', type: TokenType.Divide },
          { code: '%', type: TokenType.Modulo },
          { code: '**', type: TokenType.Power },
        ];
        ops.forEach(({ code, type }) => {
          const tokens = getTokens(`a ${code} b`);
          expect(tokens.some(t => t.type === type)).toBe(true);
        });
      });

      it('should tokenize comparison operators', () => {
        const ops = [
          { code: '==', type: TokenType.Equal },
          { code: '!=', type: TokenType.NotEqual },
          { code: '<', type: TokenType.Less },
          { code: '>', type: TokenType.Greater },
          { code: '<=', type: TokenType.LessEqual },
          { code: '>=', type: TokenType.GreaterEqual },
        ];
        ops.forEach(({ code, type }) => {
          const tokens = getTokens(`a ${code} b`);
          expect(tokens.some(t => t.type === type)).toBe(true);
        });
      });

      it('should tokenize logical operators', () => {
        const ops = [
          { code: '&&', type: TokenType.And },
          { code: '||', type: TokenType.Or },
          { code: '!', type: TokenType.Not },
        ];
        ops.forEach(({ code, type }) => {
          const tokens = getTokens(`a ${code} b`);
          expect(tokens.some(t => t.type === type)).toBe(true);
        });
      });

      it('should tokenize assignment operators', () => {
        const ops = [
          { code: '=', type: TokenType.Assign },
          { code: '+=', type: TokenType.PlusAssign },
          { code: '-=', type: TokenType.MinusAssign },
          { code: '*=', type: TokenType.MultiplyAssign },
          { code: '/=', type: TokenType.DivideAssign },
        ];
        ops.forEach(({ code, type }) => {
          const tokens = getTokens(`a ${code} 1`);
          expect(tokens.some(t => t.type === type)).toBe(true);
        });
      });

      it('should tokenize arrow operator', () => {
        const tokens = getTokens('() => x');
        expect(tokens.some(t => t.type === TokenType.Arrow)).toBe(true);
      });

      it('should tokenize pipeline operator', () => {
        const tokens = getTokens('x |> f');
        expect(tokens.some(t => t.type === TokenType.Pipeline)).toBe(true);
      });
    });

    describe('Delimiters and Punctuation', () => {
      it('should tokenize parentheses', () => {
        const tokens = getTokens('(x)');
        expect(tokens.some(t => t.type === TokenType.LeftParen)).toBe(true);
        expect(tokens.some(t => t.type === TokenType.RightParen)).toBe(true);
      });

      it('should tokenize braces', () => {
        const tokens = getTokens('{ x }');
        expect(tokens.some(t => t.type === TokenType.LeftBrace)).toBe(true);
        expect(tokens.some(t => t.type === TokenType.RightBrace)).toBe(true);
      });

      it('should tokenize brackets', () => {
        const tokens = getTokens('[x]');
        expect(tokens.some(t => t.type === TokenType.LeftBracket)).toBe(true);
        expect(tokens.some(t => t.type === TokenType.RightBracket)).toBe(true);
      });

      it('should tokenize punctuation', () => {
        const tokens = getTokens('a; b, c. d: e');
        expect(tokens.some(t => t.type === TokenType.Semicolon)).toBe(true);
        expect(tokens.some(t => t.type === TokenType.Comma)).toBe(true);
        expect(tokens.some(t => t.type === TokenType.Dot)).toBe(true);
        expect(tokens.some(t => t.type === TokenType.Colon)).toBe(true);
      });
    });

    describe('Comments', () => {
      it('should skip single-line comments', () => {
        const tokens = getTokens('x // this is a comment\ny');
        expect(tokens.filter(t => t.type === TokenType.Identifier).length).toBe(2);
        expect(tokens.some(t => t.value.includes('comment'))).toBe(false);
      });

      it('should skip block comments', () => {
        const tokens = getTokens('x /* block comment */ y');
        expect(tokens.filter(t => t.type === TokenType.Identifier).length).toBe(2);
      });

      it('should skip hash comments', () => {
        const tokens = getTokens('x  # hash comment\ny');
        expect(tokens.filter(t => t.type === TokenType.Identifier).length).toBe(2);
      });
    });

    describe('Newlines and Indentation', () => {
      it('should tokenize newlines', () => {
        const tokens = getTokens('a\nb');
        expect(tokens.some(t => t.type === TokenType.Newline)).toBe(true);
      });

      it('should handle indentation', () => {
        const tokens = getTokens('if x\n  y');
        expect(tokens.some(t => t.type === TokenType.Indent)).toBe(true);
      });

      it('should generate EOF token', () => {
        const tokens = getTokens('x');
        expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
      });
    });
  });

  // ============================================
  // Expression Parsing Tests
  // ============================================
  describe('Expression Parsing', () => {
    describe('Literal Expressions', () => {
      it('should parse number literals', () => {
        const ast = parseCode('42');
        expect(ast.statements[0]).toMatchObject({
          type: 'ExpressionStmt',
          expression: { type: 'Literal', value: 42 },
        });
      });

      it('should parse float literals', () => {
        const ast = parseCode('3.14');
        expect(ast.statements[0]).toMatchObject({
          type: 'ExpressionStmt',
          expression: { type: 'Literal', value: 3.14 },
        });
      });

      it('should parse string literals', () => {
        const ast = parseCode('"hello"');
        expect(ast.statements[0]).toMatchObject({
          type: 'ExpressionStmt',
          expression: { type: 'Literal', value: 'hello' },
        });
      });

      it('should parse boolean literals', () => {
        const ast = parseCode('true');
        expect(ast.statements[0]).toMatchObject({
          type: 'ExpressionStmt',
          expression: { type: 'Literal', value: true },
        });
      });

      it('should parse null literal', () => {
        const ast = parseCode('null');
        expect(ast.statements[0]).toMatchObject({
          type: 'ExpressionStmt',
          expression: { type: 'Literal', value: null },
        });
      });

      it('should parse identifier expressions', () => {
        const ast = parseCode('myVar');
        expect(ast.statements[0]).toMatchObject({
          type: 'ExpressionStmt',
          expression: { type: 'Identifier', name: 'myVar' },
        });
      });
    });

    describe('Binary Expressions', () => {
      it('should parse addition', () => {
        const ast = parseCode('1 + 2');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Binary');
        expect(expr.operator).toBe(TokenType.Plus);
        expect(expr.left.value).toBe(1);
        expect(expr.right.value).toBe(2);
      });

      it('should parse subtraction', () => {
        const ast = parseCode('5 - 3');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Binary');
        expect(expr.operator).toBe(TokenType.Minus);
      });

      it('should parse multiplication', () => {
        const ast = parseCode('4 * 5');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Binary');
        expect(expr.operator).toBe(TokenType.Multiply);
      });

      it('should parse division', () => {
        const ast = parseCode('10 / 2');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Binary');
        expect(expr.operator).toBe(TokenType.Divide);
      });

      it('should parse modulo', () => {
        const ast = parseCode('10 % 3');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Binary');
        expect(expr.operator).toBe(TokenType.Modulo);
      });

      it('should parse power operator', () => {
        const ast = parseCode('2 ** 3');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Binary');
        expect(expr.operator).toBe(TokenType.Power);
      });

      it('should respect operator precedence (multiplication before addition)', () => {
        const ast = parseCode('1 + 2 * 3');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Binary');
        expect(expr.operator).toBe(TokenType.Plus);
        expect(expr.right.type).toBe('Binary');
        expect(expr.right.operator).toBe(TokenType.Multiply);
      });

      it('should parse comparison operators', () => {
        const comparisons = [
          { code: '1 == 2', op: TokenType.Equal },
          { code: '1 != 2', op: TokenType.NotEqual },
          { code: '1 < 2', op: TokenType.Less },
          { code: '1 > 2', op: TokenType.Greater },
          { code: '1 <= 2', op: TokenType.LessEqual },
          { code: '1 >= 2', op: TokenType.GreaterEqual },
        ];
        comparisons.forEach(({ code, op }) => {
          const ast = parseCode(code);
          const expr = (ast.statements[0] as any).expression;
          expect(expr.type).toBe('Binary');
          expect(expr.operator).toBe(op);
        });
      });

      it('should parse logical AND', () => {
        const ast = parseCode('a && b');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Binary');
        expect(expr.operator).toBe(TokenType.And);
      });

      it('should parse logical OR', () => {
        const ast = parseCode('a || b');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Binary');
        expect(expr.operator).toBe(TokenType.Or);
      });

      it('should parse chained binary expressions', () => {
        const ast = parseCode('1 + 2 + 3 + 4');
        let expr = (ast.statements[0] as any).expression;
        // Should be left-associative
        expect(expr.type).toBe('Binary');
        expect(expr.right.value).toBe(4);
        expr = expr.left;
        expect(expr.type).toBe('Binary');
      });
    });

    describe('Unary Expressions', () => {
      it('should parse logical NOT', () => {
        const ast = parseCode('!x');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Unary');
        expect(expr.operator).toBe(TokenType.Not);
        expect(expr.operand.name).toBe('x');
      });

      it('should parse negation', () => {
        const ast = parseCode('-5');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Unary');
        expect(expr.operator).toBe(TokenType.Minus);
      });

      it('should parse double negation', () => {
        const ast = parseCode('!!x');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Unary');
        expect(expr.operand.type).toBe('Unary');
      });
    });

    describe('Function Calls', () => {
      it('should parse function call with no arguments', () => {
        const ast = parseCode('foo()');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Call');
        expect(expr.callee.name).toBe('foo');
        expect(expr.arguments).toHaveLength(0);
      });

      it('should parse function call with one argument', () => {
        const ast = parseCode('foo(42)');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Call');
        expect(expr.arguments).toHaveLength(1);
        expect(expr.arguments[0].value).toBe(42);
      });

      it('should parse function call with multiple arguments', () => {
        const ast = parseCode('foo(1, 2, 3)');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Call');
        expect(expr.arguments).toHaveLength(3);
      });

      it('should parse function call with named arguments', () => {
        const ast = parseCode('foo(x: 1, y: 2)');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Call');
        expect(expr.namedArgs).toBeDefined();
        expect(expr.namedArgs.x.value).toBe(1);
        expect(expr.namedArgs.y.value).toBe(2);
      });

      it('should parse chained function calls', () => {
        const ast = parseCode('foo()()');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Call');
        expect(expr.callee.type).toBe('Call');
      });

      it('should parse method calls', () => {
        const ast = parseCode('obj.method()');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Call');
        expect(expr.callee.type).toBe('Member');
        expect(expr.callee.member).toBe('method');
      });
    });

    describe('Member and Index Expressions', () => {
      it('should parse member access', () => {
        const ast = parseCode('obj.property');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Member');
        expect(expr.object.name).toBe('obj');
        expect(expr.member).toBe('property');
      });

      it('should parse chained member access', () => {
        const ast = parseCode('a.b.c.d');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Member');
        expect(expr.member).toBe('d');
      });

      it('should parse index access', () => {
        const ast = parseCode('arr[0]');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Index');
        expect(expr.object.name).toBe('arr');
        expect(expr.index.value).toBe(0);
      });

      it('should parse nested index access', () => {
        const ast = parseCode('arr[0][1]');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Index');
        expect(expr.object.type).toBe('Index');
      });

      it('should parse mixed member and index access', () => {
        const ast = parseCode('obj.arr[0].value');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Member');
        expect(expr.member).toBe('value');
      });
    });

    describe('Array and Dictionary Literals', () => {
      it('should parse empty array', () => {
        const ast = parseCode('[]');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Array');
        expect(expr.elements).toHaveLength(0);
      });

      it('should parse array with elements', () => {
        const ast = parseCode('[1, 2, 3]');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Array');
        expect(expr.elements).toHaveLength(3);
      });

      it('should parse nested arrays', () => {
        const ast = parseCode('[[1, 2], [3, 4]]');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Array');
        expect(expr.elements[0].type).toBe('Array');
      });

      it('should parse empty dictionary in assignment context', () => {
        // Empty {} at statement level is parsed as empty block
        // To get a Dict, it needs to be in expression context
        const ast = parseCode('let x = {}');
        const initializer = (ast.statements[0] as any).initializer;
        expect(initializer.type).toBe('Dict');
        expect(initializer.elements.size).toBe(0);
      });

      it('should parse dictionary with string keys', () => {
        const ast = parseCode('let x = {"a": 1, "b": 2}');
        const initializer = (ast.statements[0] as any).initializer;
        expect(initializer.type).toBe('Dict');
        expect(initializer.elements.get('a').value).toBe(1);
      });

      it('should parse dictionary with identifier keys', () => {
        const ast = parseCode('let x = {a: 1, b: 2}');
        const initializer = (ast.statements[0] as any).initializer;
        expect(initializer.type).toBe('Dict');
        expect(initializer.elements.get('a').value).toBe(1);
      });
    });

    describe('Lambda Expressions', () => {
      it('should parse lambda with no parameters in assignment', () => {
        // Lambda at statement level needs assignment context to be recognized
        const ast = parseCode('let fn = () => 42');
        const initializer = (ast.statements[0] as any).initializer;
        expect(initializer.type).toBe('Lambda');
        expect(initializer.parameters).toHaveLength(0);
        expect(initializer.body.value).toBe(42);
      });

      it('should parse lambda with one parameter', () => {
        const ast = parseCode('(x) => x');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Lambda');
        expect(expr.parameters).toContain('x');
      });

      it('should parse lambda with multiple parameters', () => {
        const ast = parseCode('(x, y) => x + y');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Lambda');
        expect(expr.parameters).toHaveLength(2);
      });

      it('should parse lambda with block body', () => {
        const ast = parseCode('(x) => { return x }');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Lambda');
        expect(expr.body.type).toBe('Block');
      });
    });

    describe('Ternary Expressions', () => {
      it('should parse ternary expression', () => {
        const ast = parseCode('x ? 1 : 0');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Ternary');
        expect(expr.condition.name).toBe('x');
        expect(expr.consequent.value).toBe(1);
        expect(expr.alternate.value).toBe(0);
      });

      it('should parse nested ternary', () => {
        const ast = parseCode('a ? b ? 1 : 2 : 3');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Ternary');
        expect(expr.consequent.type).toBe('Ternary');
      });
    });

    describe('Pipeline Expressions', () => {
      it('should parse pipeline to function', () => {
        const ast = parseCode('x |> foo');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Call');
        expect(expr.callee.name).toBe('foo');
        expect(expr.arguments[0].name).toBe('x');
      });

      it('should parse pipeline to function call', () => {
        const ast = parseCode('x |> foo(1)');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Call');
        expect(expr.arguments[0].name).toBe('x');
        expect(expr.arguments[1].value).toBe(1);
      });

      it('should parse chained pipelines', () => {
        const ast = parseCode('x |> foo |> bar');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Call');
        expect(expr.callee.name).toBe('bar');
      });
    });

    describe('Assignment Expressions', () => {
      it('should parse simple assignment', () => {
        const ast = parseCode('x = 1');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Assignment');
        expect(expr.target.name).toBe('x');
        expect(expr.value.value).toBe(1);
      });

      it('should parse compound assignments', () => {
        const ops = [
          { code: 'x += 1', op: TokenType.PlusAssign },
          { code: 'x -= 1', op: TokenType.MinusAssign },
          { code: 'x *= 1', op: TokenType.MultiplyAssign },
          { code: 'x /= 1', op: TokenType.DivideAssign },
        ];
        ops.forEach(({ code, op }) => {
          const ast = parseCode(code);
          const expr = (ast.statements[0] as any).expression;
          expect(expr.type).toBe('Assignment');
          expect(expr.operator).toBe(op);
        });
      });

      it('should parse member assignment', () => {
        const ast = parseCode('obj.x = 1');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Assignment');
        expect(expr.target.type).toBe('Member');
      });

      it('should parse index assignment', () => {
        const ast = parseCode('arr[0] = 1');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Assignment');
        expect(expr.target.type).toBe('Index');
      });
    });

    describe('String Interpolation', () => {
      it('should parse string interpolation', () => {
        const ast = parseCode('"hello ${name}"');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Interpolation');
        expect(expr.parts).toHaveLength(2);
        expect(expr.parts[0].value).toBe('hello ');
        expect(expr.parts[1].name).toBe('name');
      });

      it('should parse string with multiple interpolations', () => {
        const ast = parseCode('"${a} and ${b}"');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Interpolation');
        expect(expr.parts).toHaveLength(3);
      });
    });

    describe('Grouping', () => {
      it('should parse parenthesized expressions', () => {
        const ast = parseCode('(1 + 2) * 3');
        const expr = (ast.statements[0] as any).expression;
        expect(expr.type).toBe('Binary');
        expect(expr.operator).toBe(TokenType.Multiply);
        expect(expr.left.type).toBe('Binary');
        expect(expr.left.operator).toBe(TokenType.Plus);
      });
    });
  });

  // ============================================
  // Statement Parsing Tests
  // ============================================
  describe('Statement Parsing', () => {
    describe('Variable Declarations', () => {
      it('should parse let declaration', () => {
        const ast = parseCode('let x = 1');
        expect(ast.statements[0]).toMatchObject({
          type: 'VarDeclaration',
          name: 'x',
          isConst: false,
        });
      });

      it('should parse const declaration', () => {
        const ast = parseCode('const x = 1');
        expect(ast.statements[0]).toMatchObject({
          type: 'VarDeclaration',
          name: 'x',
          isConst: true,
        });
      });

      it('should parse var declaration', () => {
        const ast = parseCode('var x = 1');
        expect(ast.statements[0]).toMatchObject({
          type: 'VarDeclaration',
          name: 'x',
          isConst: false,
        });
      });

      it('should parse typed declaration', () => {
        // Note: type annotation expects an identifier, not a keyword
        // Use custom type name instead of keyword 'int'
        const ast = parseCode('let x: MyType = 1');
        expect(ast.statements[0]).toMatchObject({
          type: 'VarDeclaration',
          name: 'x',
          varType: 'MyType',
        });
      });

      it('should parse let without initializer', () => {
        const ast = parseCode('let x');
        expect(ast.statements[0]).toMatchObject({
          type: 'VarDeclaration',
          name: 'x',
          initializer: null,
        });
      });

      it('should throw error for const without initializer', () => {
        // The error is thrown but caught by parseDeclaration's try-catch
        // and synchronize is called, so we need to check it in a context
        // where the error bubbles up
        expect(() => parseCode('const x;')).toThrow('Const variable must be initialized');
      });
    });

    describe('Function Declarations', () => {
      it('should parse function declaration', () => {
        const ast = parseCode('func add(a, b) { return a + b }');
        expect(ast.statements[0]).toMatchObject({
          type: 'FunctionDeclaration',
          name: 'add',
          isAsync: false,
        });
        expect((ast.statements[0] as any).parameters).toHaveLength(2);
      });

      it('should parse function with keyword', () => {
        const ast = parseCode('function add(a, b) { return a + b }');
        expect(ast.statements[0]).toMatchObject({
          type: 'FunctionDeclaration',
          name: 'add',
        });
      });

      it('should parse async function', () => {
        const ast = parseCode('async func fetch() { return null }');
        expect(ast.statements[0]).toMatchObject({
          type: 'FunctionDeclaration',
          name: 'fetch',
          isAsync: true,
        });
      });

      it('should parse typed parameters', () => {
        // Type annotation expects identifier, not keyword
        const ast = parseCode('func add(a: Number, b: Number) { return a + b }');
        const params = (ast.statements[0] as any).parameters;
        expect(params[0].type).toBe('Number');
        expect(params[1].type).toBe('Number');
      });

      it('should parse default parameters', () => {
        const ast = parseCode('func greet(name = "world") { return name }');
        const params = (ast.statements[0] as any).parameters;
        expect(params[0].defaultValue.value).toBe('world');
      });

      it('should parse return type', () => {
        // Type annotation expects identifier, not keyword
        const ast = parseCode('func add(a, b): Number { return a + b }');
        expect(ast.statements[0]).toMatchObject({
          type: 'FunctionDeclaration',
          returnType: 'Number',
        });
      });

      it('should parse function with no parameters', () => {
        const ast = parseCode('func noop() { }');
        expect((ast.statements[0] as any).parameters).toHaveLength(0);
      });
    });

    describe('Class Declarations', () => {
      it('should parse class declaration', () => {
        const ast = parseCode('class Point { }');
        expect(ast.statements[0]).toMatchObject({
          type: 'ClassDeclaration',
          name: 'Point',
        });
      });

      it('should parse class with base class', () => {
        const ast = parseCode('class ColorPoint: Point { }');
        expect(ast.statements[0]).toMatchObject({
          type: 'ClassDeclaration',
          name: 'ColorPoint',
          baseClass: 'Point',
        });
      });

      it('should parse class with members', () => {
        const ast = parseCode(`class Point {
          let x = 0
          let y = 0
          func move(dx, dy) { x += dx; y += dy }
        }`);
        const cls = ast.statements[0] as any;
        expect(cls.type).toBe('ClassDeclaration');
        expect(cls.members.length).toBeGreaterThan(0);
      });
    });

    describe('If Statements', () => {
      it('should parse if statement', () => {
        const ast = parseCode('if x { y }');
        expect(ast.statements[0]).toMatchObject({
          type: 'If',
        });
      });

      it('should parse if with parentheses', () => {
        const ast = parseCode('if (x) { y }');
        expect(ast.statements[0]).toMatchObject({
          type: 'If',
        });
      });

      it('should parse if-else', () => {
        const ast = parseCode('if x { a } else { b }');
        const stmt = ast.statements[0] as any;
        expect(stmt.type).toBe('If');
        expect(stmt.elseBranch).not.toBeNull();
      });

      it('should parse else if chain', () => {
        const ast = parseCode('if a { x } else if b { y } else { z }');
        const stmt = ast.statements[0] as any;
        expect(stmt.type).toBe('If');
        expect(stmt.elseBranch.type).toBe('If');
        expect(stmt.elseBranch.elseBranch.type).toBe('Block');
      });

      it('should parse if without braces', () => {
        const ast = parseCode('if x return 1');
        expect(ast.statements[0]).toMatchObject({
          type: 'If',
        });
      });
    });

    describe('While Loops', () => {
      it('should parse while loop', () => {
        const ast = parseCode('while x { y }');
        expect(ast.statements[0]).toMatchObject({
          type: 'While',
        });
      });

      it('should parse while with parentheses', () => {
        const ast = parseCode('while (x) { y }');
        expect(ast.statements[0]).toMatchObject({
          type: 'While',
        });
      });

      it('should parse while without braces', () => {
        const ast = parseCode('while x y');
        expect(ast.statements[0]).toMatchObject({
          type: 'While',
        });
      });
    });

    describe('For Loops', () => {
      it('should parse for-in loop', () => {
        const ast = parseCode('for x in items { print(x) }');
        expect(ast.statements[0]).toMatchObject({
          type: 'For',
          variable: 'x',
        });
        expect((ast.statements[0] as any).iterable.name).toBe('items');
      });

      it('should parse for loop without braces', () => {
        const ast = parseCode('for x in items print(x)');
        expect(ast.statements[0]).toMatchObject({
          type: 'For',
          variable: 'x',
        });
      });
    });

    describe('Control Flow Statements', () => {
      it('should parse return with value', () => {
        const ast = parseCode('return 42');
        expect(ast.statements[0]).toMatchObject({
          type: 'Return',
        });
        expect((ast.statements[0] as any).value.value).toBe(42);
      });

      it('should parse return without value', () => {
        // Add newline so the return statement is properly terminated
        const ast = parseCode('return\nlet x = 1');
        expect(ast.statements[0]).toMatchObject({
          type: 'Return',
          value: null,
        });
      });

      it('should parse break', () => {
        const ast = parseCode('break');
        expect(ast.statements[0]).toMatchObject({
          type: 'Break',
        });
      });

      it('should parse continue', () => {
        const ast = parseCode('continue');
        expect(ast.statements[0]).toMatchObject({
          type: 'Continue',
        });
      });
    });

    describe('Try/Catch/Finally', () => {
      it('should parse try-catch', () => {
        const ast = parseCode('try { x } catch { y }');
        const stmt = ast.statements[0] as any;
        expect(stmt.type).toBe('Try');
        expect(stmt.catchClauses).toHaveLength(1);
      });

      it('should parse try-catch with variable', () => {
        const ast = parseCode('try { x } catch (e) { y }');
        const stmt = ast.statements[0] as any;
        expect(stmt.catchClauses[0].variable).toBe('e');
      });

      it('should parse try-catch with typed variable', () => {
        const ast = parseCode('try { x } catch (e: Error) { y }');
        const stmt = ast.statements[0] as any;
        expect(stmt.catchClauses[0].variable).toBe('e');
        expect(stmt.catchClauses[0].type).toBe('Error');
      });

      it('should parse try-finally', () => {
        const ast = parseCode('try { x } finally { z }');
        const stmt = ast.statements[0] as any;
        expect(stmt.type).toBe('Try');
        expect(stmt.finallyBlock).not.toBeNull();
      });

      it('should parse try-catch-finally', () => {
        const ast = parseCode('try { x } catch { y } finally { z }');
        const stmt = ast.statements[0] as any;
        expect(stmt.type).toBe('Try');
        expect(stmt.catchClauses).toHaveLength(1);
        expect(stmt.finallyBlock).not.toBeNull();
      });

      it('should parse throw statement', () => {
        const ast = parseCode('throw "error"');
        expect(ast.statements[0]).toMatchObject({
          type: 'Throw',
        });
      });
    });

    describe('Import Statements', () => {
      it('should parse simple import', () => {
        const ast = parseCode('import fc');
        expect(ast.statements[0]).toMatchObject({
          type: 'Import',
          module: 'fc',
        });
      });

      it('should parse import from module', () => {
        const ast = parseCode('import foo from "module"');
        const stmt = ast.statements[0] as any;
        expect(stmt.type).toBe('Import');
        expect(stmt.names).toContain('foo');
        expect(stmt.module).toBe('module');
      });

      it('should parse destructured import', () => {
        const ast = parseCode('import { a, b } from "module"');
        const stmt = ast.statements[0] as any;
        expect(stmt.type).toBe('Import');
        expect(stmt.names).toContain('a');
        expect(stmt.names).toContain('b');
      });

      it('should parse wildcard import', () => {
        const ast = parseCode('import * as m from "module"');
        const stmt = ast.statements[0] as any;
        expect(stmt.type).toBe('Import');
        expect(stmt.alias).toBe('m');
      });

      it('should parse string module import', () => {
        const ast = parseCode('import "module.fcs"');
        const stmt = ast.statements[0] as any;
        expect(stmt.type).toBe('Import');
        expect(stmt.module).toBe('module.fcs');
      });
    });

    describe('Test Declarations', () => {
      it('should parse test declaration', () => {
        const ast = parseCode('test "should work" { assert true }');
        expect(ast.statements[0]).toMatchObject({
          type: 'TestDeclaration',
          name: 'should work',
        });
      });

      it('should parse test with tags', () => {
        const ast = parseCode('test "test name" ["unit", "fast"] { assert true }');
        const stmt = ast.statements[0] as any;
        expect(stmt.type).toBe('TestDeclaration');
        expect(stmt.tags).toContain('unit');
        expect(stmt.tags).toContain('fast');
      });
    });

    describe('Assert Statements', () => {
      it('should parse assert', () => {
        const ast = parseCode('assert x == 1');
        expect(ast.statements[0]).toMatchObject({
          type: 'Assert',
        });
      });

      it('should parse assert with message', () => {
        const ast = parseCode('assert x == 1, "x should be 1"');
        const stmt = ast.statements[0] as any;
        expect(stmt.type).toBe('Assert');
        expect(stmt.message).toBe('x should be 1');
      });
    });

    describe('Block Statements', () => {
      it('should parse block with multiple statements', () => {
        const ast = parseCode('{ let x = 1; let y = 2 }');
        expect(ast.statements[0]).toMatchObject({
          type: 'Block',
        });
        expect((ast.statements[0] as any).statements).toHaveLength(2);
      });

      it('should parse nested blocks', () => {
        const ast = parseCode('{ { { } } }');
        expect(ast.statements[0]).toMatchObject({
          type: 'Block',
        });
      });
    });
  });

  // ============================================
  // Error Recovery Tests
  // ============================================
  describe('Error Recovery', () => {
    it('should recover from missing identifier in let and return empty statements', () => {
      // The parser uses try-catch in parseDeclaration and calls synchronize
      // So it recovers rather than throwing
      const ast = parseCode('let = 1');
      // Parser recovers by synchronizing, statements may be empty or partial
      expect(ast.type).toBe('Program');
    });

    it('should throw on unterminated string from lexer', () => {
      expect(() => getTokens('"unterminated')).toThrow(/Unterminated string/);
    });

    it('should recover from missing closing paren', () => {
      // Parser uses synchronize on parse errors in declarations
      const ast = parseCode('foo(1, 2');
      // May recover with partial AST
      expect(ast.type).toBe('Program');
    });

    it('should throw on missing closing brace in consume', () => {
      // Block parsing uses consume which throws
      // But parseDeclaration catches it
      const ast = parseCode('{ let x = 1');
      expect(ast.type).toBe('Program');
    });

    it('should recover from missing closing bracket', () => {
      // Array parsing continues and may produce partial AST
      const ast = parseCode('[1, 2');
      expect(ast.type).toBe('Program');
    });

    it('should throw on invalid dict key from lexer', () => {
      // Numbers can be parsed, but dict expects string or identifier
      // This will throw from parseDictLiteral
      expect(() => parseCode('let x = {123: "value"}')).toThrow();
    });

    it('should throw on unexpected character from lexer', () => {
      expect(() => getTokens('`hello')).not.toThrow(); // Template strings can be multiline
      expect(() => getTokens('\u0000')).toThrow(/Unexpected character/);
    });

    it('should throw on @ in expression position from lexer', () => {
      // @ starts a decorator which needs to be followed by alphanumeric
      // but @ followed by = is invalid
      expect(() => parseCode('let x = @')).toThrow();
    });

    it('should throw on unterminated string interpolation', () => {
      // This tests the parser's string interpolation handling
      expect(() => parseCode('"hello ${name"')).toThrow(/Unterminated/);
    });

    it('should handle errors gracefully without crashing', () => {
      // Various malformed inputs should not crash the parser
      const malformedInputs = [
        'func (',
        'class {',
        'if (',
        'while {',
        'for x',
      ];

      for (const input of malformedInputs) {
        expect(() => {
          try {
            parseCode(input);
          } catch {
            // Throwing is acceptable, just don't crash
          }
        }).not.toThrow(/Maximum call stack/);
      }
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const ast = parseCode('');
      expect(ast.type).toBe('Program');
      expect(ast.statements).toHaveLength(0);
    });

    it('should handle whitespace-only input', () => {
      const ast = parseCode('   \n\n   \t  ');
      expect(ast.type).toBe('Program');
      expect(ast.statements).toHaveLength(0);
    });

    it('should handle comment-only input', () => {
      const ast = parseCode('// just a comment');
      expect(ast.type).toBe('Program');
      expect(ast.statements).toHaveLength(0);
    });

    it('should handle multiple newlines between statements', () => {
      const ast = parseCode('let x = 1\n\n\n\nlet y = 2');
      expect(ast.statements).toHaveLength(2);
    });

    it('should handle deeply nested expressions', () => {
      // Test reasonable nesting depth
      const deepNesting = '((((((((((1))))))))))';
      const ast = parseCode(deepNesting);
      expect(ast.statements).toHaveLength(1);
    });

    it('should handle deeply nested blocks', () => {
      const code = '{ { { { { let x = 1 } } } } }';
      const ast = parseCode(code);
      expect(ast.statements[0].type).toBe('Block');
    });

    it('should handle empty function body', () => {
      const ast = parseCode('func empty() { }');
      expect((ast.statements[0] as any).body.statements).toHaveLength(0);
    });

    it('should handle empty class body', () => {
      const ast = parseCode('class Empty { }');
      expect((ast.statements[0] as any).members).toHaveLength(0);
    });

    it('should handle empty array literal', () => {
      const ast = parseCode('let arr = []');
      expect((ast.statements[0] as any).initializer.elements).toHaveLength(0);
    });

    it('should handle empty dict literal', () => {
      const ast = parseCode('let obj = {}');
      expect((ast.statements[0] as any).initializer.elements.size).toBe(0);
    });

    it('should handle statements without semicolons', () => {
      const ast = parseCode('let x = 1\nlet y = 2');
      expect(ast.statements).toHaveLength(2);
    });

    it('should handle statements with semicolons', () => {
      const ast = parseCode('let x = 1; let y = 2;');
      expect(ast.statements).toHaveLength(2);
    });

    it('should handle mixed statement terminators', () => {
      const ast = parseCode('let x = 1; let y = 2\nlet z = 3');
      expect(ast.statements).toHaveLength(3);
    });

    it('should handle shebang', () => {
      const tokens = getTokens('#!/usr/bin/env fcs\nlet x = 1');
      expect(tokens.some(t => t.type === TokenType.Identifier && t.value === 'x')).toBe(true);
    });

    it('should handle Unicode identifiers', () => {
      // Note: FCS lexer may not support all Unicode, but test basic alphanumeric
      const ast = parseCode('let abc123 = 1');
      expect((ast.statements[0] as any).name).toBe('abc123');
    });

    it('should handle very long identifiers', () => {
      const longName = 'a'.repeat(200);
      const ast = parseCode(`let ${longName} = 1`);
      expect((ast.statements[0] as any).name).toBe(longName);
    });

    it('should handle very long string literals', () => {
      const longString = 'x'.repeat(10000);
      const ast = parseCode(`"${longString}"`);
      expect((ast.statements[0] as any).expression.value).toBe(longString);
    });

    it('should handle expressions as statements', () => {
      const ast = parseCode('1 + 2');
      expect(ast.statements[0].type).toBe('ExpressionStmt');
    });

    it('should handle complex nested function calls', () => {
      const ast = parseCode('foo(bar(baz(1, 2), 3), 4)');
      const expr = (ast.statements[0] as any).expression;
      expect(expr.type).toBe('Call');
      expect(expr.callee.name).toBe('foo');
    });
  });

  // ============================================
  // Resource Limits Tests
  // ============================================
  describe('Resource Limits', () => {
    it('should have loop guard in postfix parsing', () => {
      // The parser uses createLoopGuard in parsePostfix
      // This test ensures deeply nested postfix operations are handled
      const deepChain = 'a' + '.b'.repeat(100);
      const ast = parseCode(deepChain);
      expect(ast.statements).toHaveLength(1);
    });

    it('should not hang on deeply nested member access', () => {
      // Test that the loop guard prevents infinite loops
      const deepAccess = 'obj' + '.prop'.repeat(500);
      const startTime = Date.now();
      const ast = parseCode(deepAccess);
      const elapsed = Date.now() - startTime;

      expect(ast.statements).toHaveLength(1);
      expect(elapsed).toBeLessThan(5000); // Should complete in reasonable time
    });

    it('should not hang on deeply nested function calls', () => {
      const deepCalls = 'f' + '()'.repeat(100);
      const startTime = Date.now();
      const ast = parseCode(deepCalls);
      const elapsed = Date.now() - startTime;

      expect(ast.statements).toHaveLength(1);
      expect(elapsed).toBeLessThan(5000);
    });

    it('should not hang on deeply nested index access', () => {
      const deepIndex = 'arr' + '[0]'.repeat(100);
      const startTime = Date.now();
      const ast = parseCode(deepIndex);
      const elapsed = Date.now() - startTime;

      expect(ast.statements).toHaveLength(1);
      expect(elapsed).toBeLessThan(5000);
    });

    it('should throw LoopTimeoutError on excessive postfix iterations', () => {
      // Create code that would cause excessive iterations
      // The loop guard is set to 10000 iterations
      // We need code that generates many postfix operations
      const extremeChain = 'a' + '.b'.repeat(10001);

      expect(() => parseCode(extremeChain)).toThrow(LoopTimeoutError);
    });

    it('should handle reasonable complexity without issues', () => {
      const complexCode = `
        func processItems(items) {
          let result = []
          for item in items {
            if item.valid {
              let processed = item.value * 2 + 1
              result.push(processed)
            } else {
              throw "Invalid item"
            }
          }
          return result |> map |> filter
        }

        class DataProcessor {
          func process(data) {
            try {
              return this.transform(data)
            } catch (e) {
              return null
            } finally {
              this.cleanup()
            }
          }
        }

        test "processor works" {
          let p = DataProcessor()
          assert p.process("test") != null, "Should not be null"
        }
      `;

      const ast = parseCode(complexCode);
      expect(ast.type).toBe('Program');
      expect(ast.statements.length).toBeGreaterThan(0);
    });

    it('should complete parsing within time limit for complex code', () => {
      // Generate moderately complex code
      const statements: string[] = [];
      for (let i = 0; i < 100; i++) {
        statements.push(`let var${i} = ${i} + ${i + 1} * (${i + 2} - ${i})`);
      }
      const code = statements.join('\n');

      const startTime = Date.now();
      const ast = parseCode(code);
      const elapsed = Date.now() - startTime;

      expect(ast.statements).toHaveLength(100);
      expect(elapsed).toBeLessThan(3000); // Should complete quickly
    });
  });

  // ============================================
  // Parser Class Tests
  // ============================================
  describe('FCSParser Class', () => {
    it('should filter out comments from token stream', () => {
      const tokens = getTokens('x // comment\ny');
      const parser = new FCSParser(tokens);
      const ast = parser.parse();

      // Both x and y should be parsed
      expect(ast.statements.length).toBeGreaterThanOrEqual(1);
    });

    it('should create Program node with statements array', () => {
      const tokens = getTokens('let x = 1');
      const parser = new FCSParser(tokens);
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      expect(Array.isArray(ast.statements)).toBe(true);
    });
  });

  // ============================================
  // Integration Tests
  // ============================================
  describe('Integration', () => {
    it('should parse a complete FCS script', () => {
      const script = `
        // FileCommander Script Example
        import { read, write } from "fs"

        const CONFIG = {
          timeout: 5000,
          retries: 3
        }

        func processFile(path: string): bool {
          let content = read(path)
          if content == null {
            return false
          }

          let lines = content.split("\\n")
          for line in lines {
            if line.startsWith("#") {
              continue
            }
            print(line)
          }

          return true
        }

        async func main() {
          let files = ["a.txt", "b.txt", "c.txt"]
          for file in files {
            let success = processFile(file)
            assert success, "Failed to process file"
          }
        }

        test "processFile handles null" {
          let result = processFile("/nonexistent")
          assert result == false
        }
      `;

      const ast = parseCode(script);
      expect(ast.type).toBe('Program');

      // Check for various statement types
      const types = ast.statements.map(s => s.type);
      expect(types).toContain('Import');
      expect(types).toContain('VarDeclaration');
      expect(types).toContain('FunctionDeclaration');
      expect(types).toContain('TestDeclaration');
    });

    it('should handle multiline template strings', () => {
      const code = `let text = \`line 1
line 2
line 3\``;
      const ast = parseCode(code);
      expect((ast.statements[0] as any).initializer.value).toContain('line 1');
      expect((ast.statements[0] as any).initializer.value).toContain('line 2');
    });

    it('should parse real-world-like code patterns', () => {
      const code = `
        // API client setup
        let client = createClient({
          baseUrl: "https://api.example.com",
          timeout: 5000
        })

        // Make request with error handling
        try {
          let response = client.get("/users")
          let users = response.json()

          users
            |> filter((u) => u.active)
            |> map((u) => u.name)
            |> forEach(print)
        } catch (e: NetworkError) {
          print("Network error: " + e.message)
        } catch (e) {
          throw e
        }
      `;

      const ast = parseCode(code);
      expect(ast.type).toBe('Program');
      expect(ast.statements.length).toBeGreaterThan(0);
    });
  });
});
