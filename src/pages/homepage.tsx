import Dropbox from "@/components/files/dropbox";
import FileList from "@/components/files/list";
import ConvertedFiles from "@/components/files/converted";

export default function Homepage() {

  return (
    <section className="section py-8">
      <Dropbox />
      <FileList />
      <ConvertedFiles />
    </section>
  )
}
