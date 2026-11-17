export interface Career { id: string; title: string; category: string; required: string[]; why: string; learn: string[] }
export const careers: Career[] = [
  { id: 'robotics', title: 'Robotics Engineer', category: 'Robotics', required: ['Python', 'ROS', 'Control Systems', 'Embedded C', 'CAD Design', 'Computer Vision'], why: 'This role combines mechanical design, control, and firmware across the robot stack.', learn: ['ROS 2 fundamentals', 'OpenCV basics'] },
  { id: 'mechatronics', title: 'Mechatronics Engineer', category: 'Engineering', required: ['Embedded C', 'Control Systems', 'CAD Design', 'Circuit Design', 'PLC Programming'], why: 'This role blends mechanical, electronic, and software disciplines.', learn: ['PLC programming basics'] },
  { id: 'auto', title: 'Automotive Software Engineer', category: 'Software', required: ['Embedded C', 'Python', 'AUTOSAR', 'CAN Bus', 'Control Systems'], why: 'Automotive software combines embedded programming, vehicle networks, and control systems.', learn: ['CAN bus protocol', 'AUTOSAR architecture'] },
  { id: 'sim', title: 'Simulation Engineer', category: 'Engineering', required: ['Python', 'Mechanics', 'FEA', 'MATLAB', 'CAD Design', 'Engineering Mathematics'], why: 'Simulation engineers build computational models of physical systems.', learn: ['Finite element analysis', 'MATLAB / Simulink'] },
  { id: 'auto-eng', title: 'Industrial Automation Engineer', category: 'Engineering', required: ['PLC Programming', 'Control Systems', 'Circuit Design', 'SCADA', 'Embedded C'], why: 'Industrial automation combines control systems, instrumentation, and factory software.', learn: ['PLC programming', 'SCADA basics'] },
  { id: 'airobot', title: 'AI and Robotics Researcher', category: 'Research', required: ['Python', 'Machine Learning', 'ROS', 'Control Systems', 'Engineering Mathematics'], why: 'This research area combines machine learning with robotics, control, and mathematics.', learn: ['Machine learning foundations', 'Reinforcement learning'] },
  { id: 'tpm', title: 'Technical Product Manager', category: 'Product', required: ['Roadmapping', 'Analytics', 'Communication', 'Mechanics', 'Python'], why: 'Technical product managers guide product direction across engineering and customer needs.', learn: ['Product roadmapping', 'Product analytics'] },
]
export const estimateFor = (c: Career, have: string[]) => {
  const skills = new Set(have.map(skill => skill.trim().toLocaleLowerCase()))
  const matched = c.required.filter(skill => skills.has(skill.toLocaleLowerCase())).length
  return c.required.length ? Math.round(100 * matched / c.required.length) : 0
}

