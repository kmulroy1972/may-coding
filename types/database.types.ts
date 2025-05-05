export interface Earmark {
    id: number;
    created_at: string;
    year: number;
    agency: string;
    subunit: string | null;
    subcommittee: string | null;
    account: string | null;
    budget_number: string | null;
    budget_function: string | null;
    recipient: string;
    amount: number;
    location: string;
    member: string | null;
}