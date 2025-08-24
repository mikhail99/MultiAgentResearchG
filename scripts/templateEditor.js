// Template Editor - Advanced Template Customization
// Run in browser console: copy and paste this code

class TemplateEditor {
  constructor() {
    this.templates = this.loadTemplates();
    console.log('🎯 Template Editor Ready!');
    console.log(`📊 Loaded ${this.templates.length} templates`);
  }

  // Load templates from localStorage
  loadTemplates() {
    try {
      return JSON.parse(localStorage.getItem('userWorkflowTemplates') || '[]');
    } catch (error) {
      console.error('Error loading templates:', error);
      return [];
    }
  }

  // Save templates to localStorage
  saveTemplates() {
    try {
      localStorage.setItem('userWorkflowTemplates', JSON.stringify(this.templates));
      console.log('💾 Templates saved successfully!');
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  }

  // List all templates
  listTemplates() {
    console.log('\n📋 Available Templates:');
    console.log('=' .repeat(50));
    this.templates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.icon} ${template.name}`);
      console.log(`   ${template.description}`);
      console.log(`   Category: ${template.category} | Used: ${template.usageCount} times`);
      console.log('');
    });
  }

  // Get template by ID
  getTemplate(id) {
    return this.templates.find(t => t.id === id);
  }

  // Edit template prompt
  editPrompt(templateId, agentName, newPrompt) {
    const template = this.getTemplate(templateId);
    if (!template) {
      console.error(`❌ Template "${templateId}" not found`);
      return;
    }

    if (!template.agentPrompts[agentName]) {
      console.error(`❌ Agent "${agentName}" not found in template`);
      return;
    }

    template.agentPrompts[agentName] = newPrompt;
    template.updatedAt = new Date().toISOString();
    this.saveTemplates();

    console.log(`✅ Updated ${agentName} prompt in "${template.name}"`);
  }

  // Add custom template
  addTemplate(templateData) {
    const newTemplate = {
      id: `custom-${Date.now()}`,
      version: '1.0',
      author: 'User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      isBuiltIn: false,
      ...templateData
    };

    this.templates.push(newTemplate);
    this.saveTemplates();

    console.log(`✅ Added new template: "${newTemplate.name}"`);
    return newTemplate.id;
  }

  // Update template settings
  updateSettings(templateId, settings) {
    const template = this.getTemplate(templateId);
    if (!template) {
      console.error(`❌ Template "${templateId}" not found`);
      return;
    }

    Object.assign(template, settings);
    template.updatedAt = new Date().toISOString();
    this.saveTemplates();

    console.log(`✅ Updated settings for "${template.name}"`);
  }

  // Clone template
  cloneTemplate(templateId, newName) {
    const template = this.getTemplate(templateId);
    if (!template) {
      console.error(`❌ Template "${templateId}" not found`);
      return;
    }

    const cloned = {
      ...template,
      id: `clone-${Date.now()}`,
      name: newName,
      version: '1.0',
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.templates.push(cloned);
    this.saveTemplates();

    console.log(`✅ Cloned "${template.name}" to "${newName}"`);
    return cloned.id;
  }

  // Delete template
  deleteTemplate(templateId) {
    const index = this.templates.findIndex(t => t.id === templateId);
    if (index === -1) {
      console.error(`❌ Template "${templateId}" not found`);
      return;
    }

    const deletedTemplate = this.templates.splice(index, 1)[0];
    this.saveTemplates();

    console.log(`🗑️ Deleted template: "${deletedTemplate.name}"`);
  }

  // Export template as JSON
  exportTemplate(templateId) {
    const template = this.getTemplate(templateId);
    if (!template) {
      console.error(`❌ Template "${templateId}" not found`);
      return;
    }

    const json = JSON.stringify(template, null, 2);
    console.log(`\n📄 Export for "${template.name}":`);
    console.log('=' .repeat(50));
    console.log(json);

    // Copy to clipboard if available
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json);
      console.log('📋 Copied to clipboard!');
    }
  }

  // Import template from JSON
  importTemplate(jsonString) {
    try {
      const template = JSON.parse(jsonString);

      // Validate required fields
      if (!template.name || !template.agentPrompts) {
        throw new Error('Invalid template format');
      }

      const newTemplate = {
        ...template,
        id: `imported-${Date.now()}`,
        isBuiltIn: false,
        author: 'Imported',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0
      };

      this.templates.push(newTemplate);
      this.saveTemplates();

      console.log(`✅ Imported template: "${newTemplate.name}"`);
      return newTemplate.id;
    } catch (error) {
      console.error('❌ Error importing template:', error.message);
    }
  }

  // Show help
  help() {
    console.log('\n🎯 Template Editor Commands:');
    console.log('=' .repeat(50));
    console.log('editor.listTemplates()          - List all templates');
    console.log('editor.getTemplate("id")        - Get template by ID');
    console.log('editor.editPrompt("id", "agent", "new prompt") - Edit agent prompt');
    console.log('editor.updateSettings("id", {setting: value}) - Update template settings');
    console.log('editor.cloneTemplate("id", "new name") - Clone template');
    console.log('editor.deleteTemplate("id")      - Delete template');
    console.log('editor.exportTemplate("id")      - Export template as JSON');
    console.log('editor.importTemplate(jsonString) - Import template from JSON');
    console.log('editor.addTemplate(templateData) - Add new custom template');
    console.log('\n💡 Example Usage:');
    console.log('   editor.editPrompt("academic-research", "Researcher", "New prompt...")');
    console.log('   editor.updateSettings("academic-research", {theme: "dark"})');
  }
}

// Initialize editor
const editor = new TemplateEditor();
window.templateEditor = editor;

// Show welcome message
console.log('\n🚀 Template Editor Initialized!');
console.log('Available commands:');
editor.help();

// Auto-list templates
setTimeout(() => {
  editor.listTemplates();
}, 100);
