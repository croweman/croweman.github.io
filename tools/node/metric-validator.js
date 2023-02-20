const path = require('path')
const {createReadStream, readdirSync} = require('fs');
const readline = require('readline');

const files = readdirSync(path.resolve(__dirname))
    .filter(x => x.endsWith('.log'))

const metrics = {}
const metricErrors = {}

async function processLineByLine(filePath) {
    console.log(`Processing file ${filePath}`)
    const fileStream = createReadStream(filePath);

    const lines = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of lines) {
        if (line.indexOf('{"metric":{') === -1 && line.indexOf('{ "metric": {') === -1)
            continue

        const metric = JSON.parse(line).metric
        const metricName = metric.name

        if (metrics[metricName] === undefined) {
            metrics[metricName] = {
                occurrences: 0,
                labelKeys: [],
                labelKeysVariations: [],
                labelVariations: [],
                labelValueTypes: [],
                metricTypes: []
            }
        }

        const currentMetricDefinition = metrics[metricName]
        currentMetricDefinition.occurrences++

        if (currentMetricDefinition.metricTypes.indexOf(metric.type) === -1)
            currentMetricDefinition.metricTypes.push(metric.type)

        const keyNames = Object.keys(metric.labels)
        keyNames.sort()

        let labelKeysVariation = ''
        let labelVariation = ''

        keyNames.forEach(key => {
            if (currentMetricDefinition.labelKeys.indexOf(key) === -1) {
                currentMetricDefinition.labelKeys.push(key)
            }

            const labelValue = metric.labels[key]
            labelKeysVariation += `${key} `
            labelVariation += `${key}=${labelValue} `

            const labelValueType = typeof labelValue

            if (currentMetricDefinition.labelValueTypes.indexOf(labelValueType) === -1)
                currentMetricDefinition.labelValueTypes.push(labelValueType)
        })

        if (keyNames.length > 0) {
            labelKeysVariation = labelKeysVariation.trimEnd()
            labelVariation = labelVariation.trimEnd()

            if (currentMetricDefinition.labelKeysVariations.indexOf(labelKeysVariation) === -1)
                currentMetricDefinition.labelKeysVariations.push(labelKeysVariation)

            if (currentMetricDefinition.labelVariations.indexOf(labelVariation) === -1)
                currentMetricDefinition.labelVariations.push(labelVariation)
        }
    }
}

const checkMetrics = async () => {
    for (const file of files) {
        await processLineByLine(file)
    }

    Object.keys(metrics).forEach(metricName => {
        const errors = []
        const metricDefinition = metrics[metricName]

        if (metricDefinition.labelKeysVariations.length > 1) {
            errors.push(`Label key variations should be the same. Number of variations should be less than or equal to 1.  Currently there are ${metricDefinition.labelKeysVariations.length}`)
        }

        if (metricDefinition.labelValueTypes.length > 1) {
            errors.push('There are more than 1 label type variations')
        } else if (metricDefinition.labelValueTypes.length === 1 && metricDefinition.labelValueTypes[0] !== 'string' ) {
            errors.push('All label values must be a string')
        }

        if (metricDefinition.metricTypes.length > 1) {
            errors.push(`There should only be 1 metric type. Currently there are ${metricDefinition.metricTypes.length}`)
        }

        if (errors.length > 0) {
            metricErrors[metricName] = errors
        }
    })
}

checkMetrics()
    .then(() => {
        console.log('Metric types and its details:')
        console.log(JSON.stringify(metrics, null, 2))

        if (Object.keys(metricErrors).length > 0) {
            console.log('There are issues with the logged metrics:')
            console.log(JSON.stringify(metricErrors, null, 2))
            process.exit(1)
        }

        console.log('All logged metrics are valid!')
    })
    .catch(err => {
        console.log('err', err)
    })
