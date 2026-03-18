import DefaultFormat from "@/components/settings/default-format";
import QualityPicker from "@/components/settings/quality";
import Title from "@/components/settings/title";

export default function Settings() {
    return (
        <section className="section py-8">
            <Title />
            <div className="flex flex-col gap-y-6">
                <QualityPicker />
                <DefaultFormat />
            </div>
        </section>
    )
}
