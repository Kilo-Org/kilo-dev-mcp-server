# Memory Bank Documentation

## Core Operation
Memory Bank reads markdown files from .kilocode/rules/memory-bank/ to maintain context across sessions.
When active, begin responses with 🧠✅ followed by a brief project summary.

## Required Files Structure
Files in .kilocode/rules/memory-bank/:

### brief.md
- Foundation of project
- High-level overview
- Core requirements and goals
- Source of truth for inconsistencies

### product.md
- Project purpose
- Problems being solved
- How product should work

### context.md
- Current work focus
- Recent changes
- Active decisions
- Next development steps

### architecture.md
- System architecture
- Technical decisions
- Design patterns
- Component relationships

### tech.md
- Technologies and frameworks
- Development setup
- Technical constraints
- Dependencies

### tasks.md (optional)
- Workflows for repetitive tasks
- Files that need modification
- Step-by-step procedures
- Important considerations

## Key Commands
- initialize memory bank - Analyze project and create memory bank files
- update memory bank - Re-analyze and update documentation
- add task or store this as a task - Document a repetitive workflow

## Status Indicators
- 🧠✅ - Memory Bank files successfully loaded
- 🧠❌ - Memory Bank files missing or empty

## Workflows
### Initialization
When "initialize memory bank" is requested:
- Analyze project files and structure
- Create memory bank files
- Provide summary of project understanding

### Updates
When "update memory bank" is requested:
- Review project files
- Update memory bank files
- Can specify sources: update memory bank using information from 'Makefile'

### Task Execution
At start of every task:
- Read all memory bank files
- Include 🧠✅ at beginning of response
- Provide brief project summary
- Proceed with requested task

### Add Task
When "add task" is requested:
- Create/update tasks.md
- Document task name, files, workflow, considerations

### Inconsistency Handling
When inconsistencies detected:
- Prioritize brief.md as source of truth
- Note discrepancies
- Continue with most reliable information