import express, { Request, Response } from 'express';

const app = express();
const port = 3080;

app.use(express.json());

// Type Definitions
interface CustomField {
    field_id: string;
    field_name: string;
    value: string;
}

interface Client {
    id: string;
    name: string;
    email: string;
    custom_fields: CustomField[];
}

// Mock Data
const clients: Client[] = [
    {
        id: 'client_1',
        name: 'Annie Kim',
        email: 'annie@example.com',
        custom_fields: [
            { field_id: 'field_upload_status', field_name: 'File Upload Status', value: 'Uploaded' }
        ]
    },
    { id: 'client_2', name: 'John Doe', email: 'john@example.com', custom_fields: [] }
];

// Endpoints
app.get('/public/v3/clients', (_req: Request, res: Response) => {
    res.json({ clients });
});

app.get('/public/v3/clients/:id', (req: Request, res: Response) => {
    const client = clients.find(c => c.id === req.params.id);
    if (client) {
        res.json({ client });
    } else {
        res.status(404).json({ error: 'Client not found' });
    }
});

app.listen(port, () => {
    console.log(`Canopy CRM Mock Server (TypeScript) listening at http://localhost:${port}`);
});
