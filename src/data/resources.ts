export type ResType = 'Course' | 'Documentation' | 'Tutorial' | 'Video' | 'Book' | 'Practical project'
export interface Resource { id?: string; title: string; type: ResType; skill: string; level: 'Beginner' | 'Intermediate' | 'Advanced'; url?: string }

// Resources listed here link directly to their publisher's documentation or open courseware.
export const resources: Resource[] = [
  { id: 'res-py-docs', title: 'Official Python Tutorial', type: 'Documentation', skill: 'Python', level: 'Beginner', url: 'https://docs.python.org/3/tutorial/' },
  { id: 'res-py-automate', title: 'Automate & Prototype with Python', type: 'Course', skill: 'Python', level: 'Intermediate', url: 'https://realpython.com/' },
  { id: 'res-ros2', title: 'ROS 2 Humble Documentation & Tutorials', type: 'Documentation', skill: 'ROS', level: 'Intermediate', url: 'https://docs.ros.org/en/humble/' },
  { id: 'res-cv-opencv', title: 'OpenCV Python Vision Tutorials', type: 'Tutorial', skill: 'Computer Vision', level: 'Intermediate', url: 'https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html' },
  { id: 'res-embc', title: 'Embedded C Firmware & Bare-Metal Guide', type: 'Course', skill: 'Embedded C', level: 'Intermediate', url: 'https://interrupt.memfault.com/blog/tag/c/' },
  { id: 'res-ctrl', title: 'Control Systems Lectures & PID Design', type: 'Video', skill: 'Control Systems', level: 'Advanced', url: 'https://ocw.mit.edu/courses/2-004-dynamics-and-control-ii-spring-2008/' },
  { id: 'res-cad', title: 'Parametric 3D CAD & Assembly Design', type: 'Tutorial', skill: 'CAD Design', level: 'Beginner', url: 'https://learn.onshape.com/' },
  { id: 'res-circuit', title: 'Analog & Digital Circuit Design Fundamentals', type: 'Course', skill: 'Circuit Design', level: 'Beginner', url: 'https://www.allaboutcircuits.com/textbook/' },
  { id: 'res-plc', title: 'IEC 61131-3 PLC Ladder & Structured Text', type: 'Course', skill: 'PLC Programming', level: 'Intermediate', url: 'https://www.plcacademy.com/' },
  { id: 'res-scada', title: 'Industrial SCADA & HMI Architecture', type: 'Course', skill: 'SCADA', level: 'Intermediate', url: 'https://inductiveuniversity.com/' },
  { id: 'res-autosar', title: 'AUTOSAR Classic & Adaptive Architecture', type: 'Documentation', skill: 'AUTOSAR', level: 'Advanced', url: 'https://www.autosar.org/standards' },
  { id: 'res-can', title: 'CAN Bus Protocol & ECU Diagnostics', type: 'Tutorial', skill: 'CAN Bus', level: 'Intermediate', url: 'https://www.csselectronics.com/pages/can-bus-simple-intro-tutorial' },
  { id: 'res-fea', title: 'Finite Element Analysis (FEA) in Engineering', type: 'Course', skill: 'FEA', level: 'Advanced', url: 'https://www.simscale.com/docs/fea/' },
  { id: 'res-matlab', title: 'MATLAB & Simulink Onramp', type: 'Course', skill: 'MATLAB', level: 'Intermediate', url: 'https://matlabacademy.mathworks.com/' },
  { id: 'res-math', title: 'Linear Algebra, Calculus & Differential Equations', type: 'Course', skill: 'Engineering Mathematics', level: 'Intermediate', url: 'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/' },
  { id: 'res-ml', title: 'Machine Learning Crash Course for Engineers', type: 'Course', skill: 'Machine Learning', level: 'Advanced', url: 'https://developers.google.com/machine-learning/crash-course' },
  { id: 'res-mech', title: 'Engineering Statics & Structural Mechanics', type: 'Book', skill: 'Mechanics', level: 'Beginner', url: 'https://engineeringstatics.org/' },
  { id: 'res-roadmap', title: 'Technical Product Roadmapping & Discovery', type: 'Tutorial', skill: 'Roadmapping', level: 'Beginner', url: 'https://www.atlassian.com/agile/product-management/roadmaps' },
  { id: 'res-analytics', title: 'Product & Engineering Telemetry Analytics', type: 'Course', skill: 'Analytics', level: 'Intermediate', url: 'https://mode.com/sql-tutorial/' },
  { id: 'res-comm', title: 'Technical Writing & Architecture Communication', type: 'Course', skill: 'Communication', level: 'Beginner', url: 'https://developers.google.com/tech-writing' },
]
