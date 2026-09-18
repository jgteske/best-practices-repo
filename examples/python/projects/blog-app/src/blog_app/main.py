# region main
from dataclasses import dataclass
from pathlib import Path

import slugkit  # an installed distribution - no sys.path tricks, no relative paths
from slugkit import unique_slug


@dataclass(frozen=True)
class Post:
    title: str
    slug: str

    @property
    def url(self) -> str:
        return f"/blog/{self.slug}/"


def publish(titles: list[str]) -> list[Post]:
    taken: set[str] = set()
    posts: list[Post] = []
    for title in titles:
        slug = unique_slug(title, taken)
        taken.add(slug)
        posts.append(Post(title, slug))
    return posts


def main() -> None:
    where = "/".join(Path(slugkit.__file__).parts[-4:])  # editable: .../src/..., wheel: site-packages
    print(f"using slugkit {slugkit.__version__} from .../{where}")
    for post in publish(["Hello, World!", "Release Notes", "Hello World"]):
        print(f"{post.url:28} {post.title}")


# endregion main
