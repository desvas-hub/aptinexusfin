export interface Question { q: string; options: string[]; answer?: number }
export interface Assessment { id: string; title: string; skill: string; questions: Question[] }
export const assessments: Assessment[] = [
  { id: 'py', title: 'Python basics', skill: 'Python', questions: [
    { q: 'What does len([1, 2, 3]) return?', options: ['2', '3', '4', 'An error'], answer: 1 },
    { q: 'Which creates an empty dictionary?', options: ['[]', '{}', '()', 'set()'], answer: 1 },
    { q: 'What does range(3) produce?', options: ['0, 1, 2', '1, 2, 3', '0, 1, 2, 3', '1, 2'], answer: 0 },
    { q: 'Which keyword defines a function?', options: ['func', 'def', 'function', 'lambda'], answer: 1 }] },
  { id: 'ec', title: 'Embedded C', skill: 'Embedded C', questions: [
    { q: 'Which qualifier marks a variable that can change outside normal program flow?', options: ['const', 'static', 'volatile', 'register'], answer: 2 },
    { q: 'How large is a uint8_t?', options: ['1 byte', '2 bytes', '4 bytes', '8 bytes'], answer: 0 },
    { q: 'Which statement sets bit 3 of register R?', options: ['R |= (1 << 3);', 'R &= (1 << 3);', 'R ^= 3;', 'R = ~3;'], answer: 0 },
    { q: 'An interrupt service routine should generally be…', options: ['long and blocking', 'short and fast', 'recursive', 'full of printf calls'], answer: 1 }] },
  { id: 'cs', title: 'Control systems', skill: 'Control Systems', questions: [
    { q: 'Negative feedback generally…', options: ['reduces error', 'always increases error', 'removes the need for sensors', 'needs no controller'], answer: 0 },
    { q: 'In a PID controller, the I term…', options: ['predicts future error', 'accumulates past error', 'is proportional to error', 'filters noise'], answer: 1 },
    { q: 'A stable system’s step response…', options: ['grows without bound', 'settles to a finite value', 'oscillates with growing size', 'is undefined'], answer: 1 },
    { q: 'A transfer function relates…', options: ['output to input in the Laplace domain', 'time to frequency only', 'voltage to current only', 'memory to CPU'], answer: 0 }] },
]
