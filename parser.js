const fs = require('fs');
const { JSDOM } = require('jsdom');
const axios = require('axios');
const xmlBuilder = require('xmlbuilder');
const { v4: uuidv4 } = require('uuid');

// Define TestCaseResultDto
class TestCaseResultDto {
    constructor(methodName, methodType, actualScore, earnedScore, status, isMandatory, errorMessage) {
        this.methodName = methodName;
        this.methodType = methodType;
        this.actualScore = actualScore;
        this.earnedScore = earnedScore;
        this.status = status;
        this.isMandatory = isMandatory;
        this.errorMessage = errorMessage;
    }
}

// Define TestResults
class TestResults {
    constructor() {
        this.testCaseResults = {};
        this.customData = '';
    }
}

// Function to delete output files if they exist
function deleteOutputFiles() {
    const outputFiles = [
        "./output_revised.txt",
        "./output_boundary_revised.txt",
        "./output_exception_revised.txt"
    ];

    outputFiles.forEach(file => {
        // Check if the file exists
        if (fs.existsSync(file)) {
            // Delete the file if it exists
            fs.unlinkSync(file);
            console.log(`Deleted: ${file}`);
        }
    });
}

// Function to check required HTML tags
function checkHtmlTags(htmlContent, requiredTags) {
    const dom = new JSDOM(htmlContent);
    const results = {};

    requiredTags.forEach(tag => {
        const tagFound = dom.window.document.getElementsByTagName(tag).length > 0;
        console.log(tag, " found result : ", tagFound);
        results[tag] = tagFound ? 'pass' : 'fail';
    });

    return results;
}

// Function to check required HTML tags
function checkHtmlTags(htmlContent, requiredTags) {
    const dom = new JSDOM(htmlContent);
    const results = {};

    requiredTags.forEach(tag => {
        const tagFound = dom.window.document.getElementsByTagName(tag).length > 0;
        console.log(tag, " found result : ", tagFound);
        results[tag] = tagFound ? 'pass' : 'fail';
    });

    return results;
}

// Function to check required HTML attributes
function checkHtmlAttributes(htmlContent, tagName, attributes) {
    const dom = new JSDOM(htmlContent);
    const elements = dom.window.document.getElementsByTagName(tagName);
    const attributeResults = {};

    attributes.forEach(attribute => {
        let attributeFound = false;

        for (let element of elements) {
            if (element.hasAttribute(attribute)) {
                attributeFound = true;
                break;
            }
        }

        console.log(`Attribute "${attribute}" in <${tagName}> found result: `, attributeFound);
        attributeResults[attribute] = attributeFound ? 'pass' : 'fail';
    });

    return attributeResults;
}

// Format results into the TestCaseResultDto structure
function formatTestResults(results, methodName, methodType) {
    const testCaseResult = new TestCaseResultDto(
        methodName,
        methodType,
        1,
        Object.values(results).includes('fail') ? 0 : 1, // If any result is 'fail', set score to 0
        Object.values(results).includes('fail') ? 'Failed' : 'Passed', // If any result is 'fail', set status to 'Failed'
        true, // Is Mandatory
        ''
    );    

    const testResults = new TestResults();
    const GUID = "218f52f6-d55f-477f-9c9e-a9c33b5d5df0";  // Generate a unique GUID for each test case
    testResults.testCaseResults[GUID] = testCaseResult;
    testResults.customData = 'Custom data goes here';  // Placeholder for custom data

    return testResults;
}

// Generate XML report (just like Angular code)
function generateXmlReport(result) {
    const xml = xmlBuilder.create('test-cases')
        .ele('case')
        .ele('test-case-type', result.status)
        .up()
        .ele('name', result.methodName)
        .up()
        .ele('status', result.status)
        .up()
        .end({ pretty: true });
    return xml;
}

// Function to write to output files
function writeOutputFiles(result, fileType) {
    let resultStatus = result.status === 'Passed' ? 'PASS' : 'FAIL';
    let output = `${result.methodName}=${resultStatus}\n`;

    const outputFiles = {
        functional: "./output_revised.txt",
        boundary: "./output_boundary_revised.txt",
        exception: "./output_exception_revised.txt",
        xml: "./yaksha-test-cases.xml"
    };

    // Choose the file based on the type
    let outputFilePath = outputFiles[fileType];
    if (outputFilePath) {
        fs.appendFileSync(outputFilePath, output);
    }
}

// Read the custom.ih file (similar to Angular code)
function readCustomFile() {
    let customData = '';
    try {
        customData = fs.readFileSync('../custom.ih', 'utf8');
    } catch (err) {
        console.error('Error reading custom.ih file:', err);
    }
    return customData;
}

// Dynamic function to handle the test case execution
async function handleTestCase(filePath, testCaseName, testCaseType, testLogic, extraParams = {}) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');

        // Read custom.ih file content
        const customData = readCustomFile();

        // Execute the test logic based on test case type
        const results = testLogic(data, ...extraParams);
        
        // Format test results and attach custom data
        const testResults = formatTestResults(results, testCaseName, testCaseType);
        testResults.customData = customData;

        // console.log(`${testCaseType} Results:`, results);
        console.log(`Sending data as:`, testResults);
        
        // Send results to the server
        // const response = await axios.post('https://yaksha-prod-sbfn.azurewebsites.net/api/YakshaMFAEnqueue?code=jSTWTxtQ8kZgQ5FC0oLgoSgZG7UoU9Asnmxgp6hLLvYId/GW9ccoLw==', testResults, {
        const response = await axios.post('https://compiler.techademy.com/v1/mfa-results/push', testResults, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log(`${testCaseType} Test Case Server Response:`, response.data);

        // Generate XML report and save to file
        const xml = generateXmlReport(testResults.testCaseResults[Object.keys(testResults.testCaseResults)[0]]);
        fs.writeFileSync(`${testCaseType.toLowerCase().replace(' ', '-')}-test-report.xml`, xml);

        // Write to output files (functional, boundary, exception)
        writeOutputFiles(testResults.testCaseResults[Object.keys(testResults.testCaseResults)[0]], 'functional');
    } catch (error) {
        console.error(`Error executing ${testCaseType} test case:`, error);
    }
}

// File path for the HTML file to check
const filePath = 'index.html';

// Define test cases
const htmlTagsTestCase = {
    testCaseName: 'HTML Tags Test',
    testCaseType: 'boundary',
    testLogic: checkHtmlTags,
    extraParams: [['html', 'body', 'title', 'h1', 'p', 'iframe', 'code']]
};

const htmlFrameAttributesTestCase = {
    testCaseName: 'HTML iFrame Attributes Test',
    testCaseType: 'boundary',
    testLogic: checkHtmlAttributes,
    extraParams: ['iFrame', ['src', 'title']]
};

function executeAllTestCases() {
    // Delete the output files before running the tests
    deleteOutputFiles();
    
    // Execute both test cases dynamically
    handleTestCase(filePath, htmlTagsTestCase.testCaseName, htmlTagsTestCase.testCaseType, htmlTagsTestCase.testLogic, htmlTagsTestCase.extraParams);
    handleTestCase(filePath, htmlFrameAttributesTestCase.testCaseName, htmlFrameAttributesTestCase.testCaseType, htmlFrameAttributesTestCase.testLogic, htmlFrameAttributesTestCase.extraParams);
}

executeAllTestCases();
