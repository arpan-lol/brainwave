import { routeRequest } from './agents/router/index.js';
import { runCreativeAgent } from './agents/creative/index.js';
import { validateDesign } from './agents/validation/index.js';
import type { CanvasState, Platform } from './agents/types.js';

const exampleCanvas: CanvasState = {
  width: 1200,
  height: 628,
  elements: [],
  background: {
    color: '#FFFFFF',
  },
};

async function testRouter() {
  console.log('\n=== Testing Router Agent ===');
  
  const result = await routeRequest(exampleCanvas, 'Create a product banner for Amazon');
  
  console.log('Router Output:', JSON.stringify(result, null, 2));
}

async function testCreativeAgent() {
  console.log('\n=== Testing Creative Agent ===');
  
  const result = await runCreativeAgent(
    exampleCanvas,
    'amazon',
    'Add a product image and headline'
  );
  
  console.log('Design Options:', result.designOptions.length);
  console.log('Requires HITL:', result.requiresHITL);
  console.log('Phase:', result.phase);
}

async function testValidationAgent() {
  console.log('\n=== Testing Validation Agent ===');
  
  const testCanvas: CanvasState = {
    width: 1200,
    height: 500,
    elements: [
      {
        id: 'text-1',
        type: 'text',
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        style: { fontSize: 10 },
        content: 'Small text',
      },
    ],
    background: {
      color: '#FF0000',
    },
  };
  
  const result = await validateDesign(testCanvas, 'amazon');
  
  console.log('Validation Result:');
  console.log('- Is Compliant:', result.isCompliant);
  console.log('- Violations:', result.violations.length);
  console.log('- Warnings:', result.warnings.length);
  console.log('- Tier Used:', result.tier);
  
  if (result.violations.length > 0) {
    console.log('\nViolations:');
    result.violations.forEach(v => {
      console.log(`  - ${v.rule}: ${v.message} (${v.severity})`);
    });
  }
}

async function testCompleteWorkflow() {
  console.log('\n=== Testing Complete Workflow ===');
  
  const userRequest = 'Create an Amazon product ad with a headline and validate it';
  
  console.log('1. Routing request...');
  const routing = await routeRequest(exampleCanvas, userRequest);
  console.log('   Category:', routing.category);
  console.log('   Platform:', routing.platform);
  
  if (routing.category === 'creative' || routing.category === 'combined') {
    console.log('\n2. Running creative agent...');
    const creative = await runCreativeAgent(
      exampleCanvas,
      routing.platform as Platform,
      userRequest
    );
    console.log('   Design options generated:', creative.designOptions.length);
    
    if (routing.category === 'combined') {
      console.log('\n3. Validating design...');
      const validation = await validateDesign(
        creative.canvasState,
        routing.platform as Platform
      );
      console.log('   Is compliant:', validation.isCompliant);
      console.log('   Violations:', validation.violations.length);
    }
  }
}

async function runExamples() {
  console.log('LangGraph Agent Examples');
  console.log('=======================\n');
  
  try {
    await testRouter();
  } catch (error) {
    console.error('Router test failed:', error);
  }
  
  try {
    await testCreativeAgent();
  } catch (error) {
    console.error('Creative agent test failed:', error);
  }
  
  try {
    await testValidationAgent();
  } catch (error) {
    console.error('Validation agent test failed:', error);
  }
  
  try {
    await testCompleteWorkflow();
  } catch (error) {
    console.error('Complete workflow test failed:', error);
  }
  
  console.log('\n=== Tests Complete ===\n');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  runExamples().catch(console.error);
}

export { testRouter, testCreativeAgent, testValidationAgent, testCompleteWorkflow };
