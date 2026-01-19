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
    updated_at: string;
}

// Mock Data
const clients: Client[] = [
    {
        id: 'client_1',
        name: 'Annie Kim',
        email: 'annie@example.com',
        custom_fields: [
            { field_id: 'field_upload_status', field_name: 'File Upload Status', value: 'Uploaded' }
        ],
        updated_at: '2024-01-19T10:00:00Z'
    },
    {
        id: 'client_2',
        name: 'John Doe',
        email: 'john@example.com',
        custom_fields: [],
        updated_at: '2024-01-19T09:00:00Z'
    }
];

// Endpoints
app.get('/public/v3/clients', (req: Request, res: Response) => {
    const updatedAtParam = typeof req.query.updated_at === 'string' ? req.query.updated_at : undefined;
    const limitParam = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;
    const updatedAt = updatedAtParam ? new Date(updatedAtParam) : undefined;

    let result = clients;
    if (updatedAt && !Number.isNaN(updatedAt.getTime())) {
        result = result.filter(client => new Date(client.updated_at) > updatedAt);
    }
    if (limitParam && Number.isFinite(limitParam)) {
        result = result.slice(0, limitParam);
    }

    res.json({ clients: result });
});

app.get('/public/v3/clients/search', (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const queryField = typeof req.query.query_field === 'string' ? req.query.query_field : '';
    const limitParam = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : undefined;

    if (!q || !queryField) {
        res.status(400).json({ error: 'Missing q or query_field' });
        return;
    }

    const needle = q.toLowerCase();
    let result = clients.filter(client => {
        if (queryField === 'email') {
            return client.email.toLowerCase().includes(needle);
        }
        if (queryField === 'name') {
            return client.name.toLowerCase().includes(needle);
        }
        return false;
    });

    if (limitParam && Number.isFinite(limitParam)) {
        result = result.slice(0, limitParam);
    }

    res.json({ clients: result });
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
