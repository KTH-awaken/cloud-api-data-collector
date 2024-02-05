import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';


dotenv.config();
const cloudDataSchema = new mongoose.Schema({
    timestamp: Date,
    averageTemp: Number,
    averageCpuLoad: Number,
    averageRamLoad: Number,
    averageGpuTemp: Number,
    ramTotal: Number,
    ramUsed: Number,
    cpuCoreTotal: Number,
    cpuCoreUsed: Number,
    gpuTotal: Number,
}, { timestamps: true });

const DataModel = mongoose.model('Data', cloudDataSchema);

const uri = "mongodb+srv://hamada99:hamada99@cluster0.iszcqvt.mongodb.net/?retryWrites=true&w=majority"
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });



function mapHostData(jsonData) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

    const hosts = data[0].status.hosts;

    const dataMap = hosts.map(host => ({
        cpuTemp: host.cpu.temp.main,
        cpuLoad: host.cpu.load.main,
        ramLoad: host.ram.load.main,
        gpuTemps: host.gpu ? host.gpu.temp[0].main : null,
    }));

    return {
        averageTemp: +(dataMap.reduce((acc, curr) => acc + curr.cpuTemp, 0) / dataMap.length).toFixed(2),
        averageCpuLoad: +(dataMap.reduce((acc, curr) => acc + curr.cpuLoad, 0) / dataMap.length).toFixed(2),
        averageRamLoad: +(dataMap.reduce((acc, curr) => acc + curr.ramLoad, 0) / dataMap.length).toFixed(2),
        averageGpuTemp: +(dataMap.reduce((acc, curr) => acc + curr.gpuTemps, 0) / dataMap.length).toFixed(2),
    }
}

function mapCapData(jsonData) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

    const capacities = data[0].capacities;

    return {
        ramTotal: capacities.ram.total,
        ramUsed: capacities.ram.used,
        cpuCoreTotal: capacities.cpuCore.total,
        cpuCoreUsed: capacities.cpuCore.used,
        gpuTotal: capacities.gpu.total,
    }
}

function fetchDataAndSave() {
    const statusUrl = 'https://api.cloud.cbh.kth.se/landing/v2/status?n=1';
    const capacitiesUrl = 'https://api.cloud.cbh.kth.se/landing/v2/capacities';

    Promise.all([
        axios.get(statusUrl),
        axios.get(capacitiesUrl)
    ]).then(([statusResponse, capacitiesResponse]) => {
        const mappedHostData = mapHostData(statusResponse.data);
        const mappedCapData = mapCapData(capacitiesResponse.data);

        const dataToSave = {
            ...mappedHostData,
            ...mappedCapData,
            timestamp: new Date() // Capture the current time
        };

        DataModel.create(dataToSave).then(() => {
            console.log('Data saved successfully');
        }).catch(err => {
            console.error('Error saving data to MongoDB:', err);
        });

    }).catch(error => {
        console.error('Error fetching data:', error);
    });
}


fetchDataAndSave();
setInterval(fetchDataAndSave, 2000);