"""Bundled AptiNexus starter catalogs migrated from the frontend demo datasets.

These are seed/catalog records, not user-verified credentials or AI-generated results.
"""

CAREERS = [
    {"id": "robotics", "title": "Robotics Engineer", "category": "Robotics", "required": ["Python", "ROS", "Control Systems", "Embedded C", "CAD Design", "Computer Vision"], "why": "This role combines mechanical design, control, and firmware across the robot stack.", "learn": ["ROS 2 fundamentals", "OpenCV basics"]},
    {"id": "mechatronics", "title": "Mechatronics Engineer", "category": "Engineering", "required": ["Embedded C", "Control Systems", "CAD Design", "Circuit Design", "PLC Programming"], "why": "This role blends mechanical, electronic, and software disciplines.", "learn": ["PLC programming basics"]},
    {"id": "auto", "title": "Automotive Software Engineer", "category": "Software", "required": ["Embedded C", "Python", "AUTOSAR", "CAN Bus", "Control Systems"], "why": "Automotive software combines embedded programming, vehicle networks, and control systems.", "learn": ["CAN bus protocol", "AUTOSAR architecture"]},
    {"id": "sim", "title": "Simulation Engineer", "category": "Engineering", "required": ["Python", "Mechanics", "FEA", "MATLAB", "CAD Design", "Engineering Mathematics"], "why": "Simulation engineers build computational models of physical systems.", "learn": ["Finite element analysis", "MATLAB / Simulink"]},
    {"id": "auto-eng", "title": "Industrial Automation Engineer", "category": "Engineering", "required": ["PLC Programming", "Control Systems", "Circuit Design", "SCADA", "Embedded C"], "why": "Industrial automation combines control systems, instrumentation, and factory software.", "learn": ["PLC programming", "SCADA basics"]},
    {"id": "airobot", "title": "AI and Robotics Researcher", "category": "Research", "required": ["Python", "Machine Learning", "ROS", "Control Systems", "Engineering Mathematics"], "why": "This research area combines machine learning with robotics, control, and mathematics.", "learn": ["Machine learning foundations", "Reinforcement learning"]},
    {"id": "tpm", "title": "Technical Product Manager", "category": "Product", "required": ["Roadmapping", "Analytics", "Communication", "Mechanics", "Python"], "why": "Technical product managers guide product direction across engineering and customer needs.", "learn": ["Product roadmapping", "Product analytics"]},
]

SKILLS = [
    {"name": "Python", "category": "Programming", "difficulty": "Beginner", "desc": "General-purpose language for automation, data and robotics.", "prereqs": [], "related": ["ROS", "Machine Learning", "Computer Vision"]},
    {"name": "Embedded C", "category": "Electronics", "difficulty": "Intermediate", "desc": "Firmware programming for microcontrollers.", "prereqs": ["Circuit Design"], "related": ["Control Systems", "CAN Bus"]},
    {"name": "Circuit Design", "category": "Electronics", "difficulty": "Beginner", "desc": "Designing and analysing electrical circuits.", "prereqs": [], "related": ["Embedded C", "PLC Programming"]},
    {"name": "CAD Design", "category": "Engineering", "difficulty": "Beginner", "desc": "Modelling mechanical parts and assemblies.", "prereqs": [], "related": ["FEA", "Mechanics"]},
    {"name": "Mechanics", "category": "Engineering", "difficulty": "Beginner", "desc": "Statics and dynamics of physical systems.", "prereqs": [], "related": ["FEA", "CAD Design"]},
    {"name": "Engineering Mathematics", "category": "Foundations", "difficulty": "Intermediate", "desc": "Calculus, linear algebra and differential equations.", "prereqs": [], "related": ["Control Systems", "Machine Learning"]},
    {"name": "Control Systems", "category": "Engineering", "difficulty": "Advanced", "desc": "Feedback loops and stability of dynamic systems.", "prereqs": ["Engineering Mathematics"], "related": ["ROS", "PLC Programming", "Embedded C"]},
    {"name": "ROS", "category": "Robotics", "difficulty": "Intermediate", "desc": "Middleware for building robot software.", "prereqs": ["Python", "Control Systems"], "related": ["Computer Vision"]},
    {"name": "Computer Vision", "category": "Robotics", "difficulty": "Advanced", "desc": "Extracting information from images and video.", "prereqs": ["Python"], "related": ["Machine Learning", "ROS"]},
    {"name": "Machine Learning", "category": "Data & AI", "difficulty": "Advanced", "desc": "Models that learn patterns from data.", "prereqs": ["Python", "Engineering Mathematics"], "related": ["Computer Vision"]},
    {"name": "PLC Programming", "category": "Automation", "difficulty": "Intermediate", "desc": "Programming industrial logic controllers.", "prereqs": ["Circuit Design"], "related": ["SCADA", "Control Systems"]},
    {"name": "SCADA", "category": "Automation", "difficulty": "Intermediate", "desc": "Supervisory monitoring of industrial processes.", "prereqs": ["PLC Programming"], "related": ["PLC Programming"]},
    {"name": "AUTOSAR", "category": "Automotive", "difficulty": "Advanced", "desc": "Standard software architecture for vehicle ECUs.", "prereqs": ["Embedded C"], "related": ["CAN Bus"]},
    {"name": "CAN Bus", "category": "Automotive", "difficulty": "Intermediate", "desc": "Vehicle network protocol for ECUs.", "prereqs": ["Embedded C"], "related": ["AUTOSAR"]},
    {"name": "FEA", "category": "Simulation", "difficulty": "Advanced", "desc": "Finite element analysis of structures.", "prereqs": ["Mechanics", "Engineering Mathematics"], "related": ["CAD Design", "MATLAB"]},
    {"name": "MATLAB", "category": "Simulation", "difficulty": "Intermediate", "desc": "Numerical computing and modelling.", "prereqs": ["Engineering Mathematics"], "related": ["FEA", "Control Systems"]},
    {"name": "Roadmapping", "category": "Product", "difficulty": "Beginner", "desc": "Planning product direction and priorities.", "prereqs": [], "related": ["Analytics", "Communication"]},
    {"name": "Analytics", "category": "Product", "difficulty": "Intermediate", "desc": "Using data to guide product decisions.", "prereqs": [], "related": ["Roadmapping"]},
    {"name": "Communication", "category": "Professional", "difficulty": "Beginner", "desc": "Explaining technical ideas clearly.", "prereqs": [], "related": ["Roadmapping"]},
]

RESOURCES = [
    {"title": "Official Python tutorial", "type": "Documentation", "skill": "Python", "level": "Beginner", "url": "https://docs.python.org/3/tutorial/"},
    {"title": "ROS documentation", "type": "Documentation", "skill": "ROS", "level": "Intermediate", "url": "https://docs.ros.org"},
    {"title": "OpenCV documentation", "type": "Documentation", "skill": "Computer Vision", "level": "Intermediate", "url": "https://docs.opencv.org"},
]

ASSESSMENTS = [
    {"id": "py", "title": "Python basics", "skill": "Python", "questions": [
        {"q": "What does len([1, 2, 3]) return?", "options": ["2", "3", "4", "An error"], "answer": 1},
        {"q": "Which creates an empty dictionary?", "options": ["[]", "{}", "()", "set()"], "answer": 1},
        {"q": "What does range(3) produce?", "options": ["0, 1, 2", "1, 2, 3", "0, 1, 2, 3", "1, 2"], "answer": 0},
        {"q": "Which keyword defines a function?", "options": ["func", "def", "function", "lambda"], "answer": 1},
    ]},
    {"id": "ec", "title": "Embedded C", "skill": "Embedded C", "questions": [
        {"q": "Which qualifier marks a variable that can change outside normal program flow?", "options": ["const", "static", "volatile", "register"], "answer": 2},
        {"q": "How large is a uint8_t?", "options": ["1 byte", "2 bytes", "4 bytes", "8 bytes"], "answer": 0},
        {"q": "Which statement sets bit 3 of register R?", "options": ["R |= (1 << 3);", "R &= (1 << 3);", "R ^= 3;", "R = ~3;"], "answer": 0},
        {"q": "An interrupt service routine should generally be…", "options": ["long and blocking", "short and fast", "recursive", "full of printf calls"], "answer": 1},
    ]},
    {"id": "cs", "title": "Control systems", "skill": "Control Systems", "questions": [
        {"q": "Negative feedback generally…", "options": ["reduces error", "always increases error", "removes the need for sensors", "needs no controller"], "answer": 0},
        {"q": "In a PID controller, the I term…", "options": ["predicts future error", "accumulates past error", "is proportional to error", "filters noise"], "answer": 1},
        {"q": "A stable system’s step response…", "options": ["grows without bound", "settles to a finite value", "oscillates with growing size", "is undefined"], "answer": 1},
        {"q": "A transfer function relates…", "options": ["output to input in the Laplace domain", "time to frequency only", "voltage to current only", "memory to CPU"], "answer": 0},
    ]},
]

