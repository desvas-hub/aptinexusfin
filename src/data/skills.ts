import type { Career } from './careers'
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type Priority = 'Essential' | 'Recommended' | 'Specialization-specific' | 'Optional'
export interface LibSkill { name: string; category: string; difficulty: Difficulty; desc: string; prereqs: string[]; related: string[] }
type T = [string, string, Difficulty, string, string[], string[]]
const rows: T[] = [
  ['Python', 'Programming', 'Beginner', 'General-purpose language for automation, data and robotics.', [], ['ROS', 'Machine Learning', 'Computer Vision']],
  ['Embedded C', 'Electronics', 'Intermediate', 'Firmware programming for microcontrollers.', ['Circuit Design'], ['Control Systems', 'CAN Bus']],
  ['Circuit Design', 'Electronics', 'Beginner', 'Designing and analysing electrical circuits.', [], ['Embedded C', 'PLC Programming']],
  ['CAD Design', 'Engineering', 'Beginner', 'Modelling mechanical parts and assemblies.', [], ['FEA', 'Mechanics']],
  ['Mechanics', 'Engineering', 'Beginner', 'Statics and dynamics of physical systems.', [], ['FEA', 'CAD Design']],
  ['Engineering Mathematics', 'Foundations', 'Intermediate', 'Calculus, linear algebra and differential equations.', [], ['Control Systems', 'Machine Learning']],
  ['Control Systems', 'Engineering', 'Advanced', 'Feedback loops and stability of dynamic systems.', ['Engineering Mathematics'], ['ROS', 'PLC Programming', 'Embedded C']],
  ['ROS', 'Robotics', 'Intermediate', 'Middleware for building robot software.', ['Python', 'Control Systems'], ['Computer Vision']],
  ['Computer Vision', 'Robotics', 'Advanced', 'Extracting information from images and video.', ['Python'], ['Machine Learning', 'ROS']],
  ['Machine Learning', 'Data & AI', 'Advanced', 'Models that learn patterns from data.', ['Python', 'Engineering Mathematics'], ['Computer Vision']],
  ['PLC Programming', 'Automation', 'Intermediate', 'Programming industrial logic controllers.', ['Circuit Design'], ['SCADA', 'Control Systems']],
  ['SCADA', 'Automation', 'Intermediate', 'Supervisory monitoring of industrial processes.', ['PLC Programming'], ['PLC Programming']],
  ['AUTOSAR', 'Automotive', 'Advanced', 'Standard software architecture for vehicle ECUs.', ['Embedded C'], ['CAN Bus']],
  ['CAN Bus', 'Automotive', 'Intermediate', 'Vehicle network protocol for ECUs.', ['Embedded C'], ['AUTOSAR']],
  ['FEA', 'Simulation', 'Advanced', 'Finite element analysis of structures.', ['Mechanics', 'Engineering Mathematics'], ['CAD Design', 'MATLAB']],
  ['MATLAB', 'Simulation', 'Intermediate', 'Numerical computing and modelling.', ['Engineering Mathematics'], ['FEA', 'Control Systems']],
  ['Roadmapping', 'Product', 'Beginner', 'Planning product direction and priorities.', [], ['Analytics', 'Communication']],
  ['Analytics', 'Product', 'Intermediate', 'Using data to guide product decisions.', [], ['Roadmapping']],
  ['Communication', 'Professional', 'Beginner', 'Explaining technical ideas clearly.', [], ['Roadmapping']],
]
export const library: LibSkill[] = rows.map(([name, category, difficulty, desc, prereqs, related]) => ({ name, category, difficulty, desc, prereqs, related }))
export const byName = (n: string) => library.find(s => s.name === n)
// Required-skill ordering in the career catalog defines these learning priorities.
export const priorityOf = (c: Career, s: string): Priority => { const i = c.required.indexOf(s); return i < 3 ? 'Essential' : i < 5 ? 'Recommended' : 'Specialization-specific' }
export function analyse(c: Career, have: string[] = []) {
  const skills = new Set(have.map(skill => skill.trim().toLocaleLowerCase()))
  const strengths = c.required.filter(s => skills.has(s.toLocaleLowerCase()))
  const missing = c.required.filter(s => !skills.has(s.toLocaleLowerCase()))
  const optional = library.filter(l => !c.required.includes(l.name) && !skills.has(l.name.toLocaleLowerCase()) && l.related.some(r => c.required.includes(r))).slice(0, 2).map(l => l.name)
  return { strengths, missing, optional }
}

