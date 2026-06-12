import DefaultFormat from "@/components/settings/default-format";
import QualityPicker from "@/components/settings/quality";

export default function Settings() {
    return (
        <section className="section py-8 2xl:py-12">
            <div className="mb-6 2xl:mb-8">
                <h2 className="text-2xl 2xl:text-3xl font-body font-semibold text-foreground">Settings</h2>
                <p className="text-sm 2xl:text-base text-muted-foreground mt-1">
                    Default quality and formats for new conversions.
                </p>
            </div>
            <div className="flex flex-col gap-y-6 2xl:gap-y-8">
                <QualityPicker />
                <DefaultFormat />
            </div>
        </section>
    )
}
