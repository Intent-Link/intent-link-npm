export default async function Destination({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <main>Destination {id}</main>;
}
